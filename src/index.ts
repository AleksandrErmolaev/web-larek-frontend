import './scss/styles.scss';

import { CDN_URL, API_URL } from './utils/constants';
import { EventEmitter } from './components/base/EventEmitter';
import { ShopAPI } from './components/special/ShopAPI';
import { AppStateModelEvents, AppStateModel } from './models/global/AppState';
import { IOrder, IProduct, TOrderStep } from './types';
import { ProductsView } from './components/catalog/Products';
import { cloneTemplate, ensureElement, formatPrice } from './utils/utils';
import { ProductView, TProductRenderArgs } from './components/catalog/Product';
import { TViewNested } from './components/base/View';
import { PageView } from './components/global/Page';
import { HeaderView } from './components/global/Header';
import { ModalView, ModalViewEvents } from './components/global/Modal';
import {
	ProductPreviewView,
	TProductPreviewRenderArgs,
} from './components/catalog/ProductPreview';
import {
	BasketItemView,
	TBasketItemRenderArgs,
} from './components/basket/BasketItem';
import { BasketView, TBasketRenderArgs } from './components/basket/Basket';
import {
	OrderShipmentView,
	TOrderShipmentRenderArgs,
} from './components/order/OrderShipment';
import {
	OrderContactsView,
	TOrderContactsRenderArgs,
} from './components/order/OrderContacts';
import {
	OrderSuccessView,
	TOrderSuccessRenderArgs,
} from './components/order/OrderSuccess';

const CURRENCY_TITLES: [string, string, string] = [
	'синапс',
	'синапса',
	'синапсов',
];

const eventEmitter = new EventEmitter();

const api = new ShopAPI(CDN_URL, API_URL);

const appStateModel = new AppStateModel({}, eventEmitter);

const pageView = new PageView({
	element: ensureElement('.page'),
	eventEmitter,
});

const headerView = new HeaderView({
	element: ensureElement('.header'),
	eventEmitter,
	eventHandlers: {
		onClick: () => {
			appStateModel.initBasket();
		},
	},
});

const modalView = new ModalView({
	element: ensureElement('#modal-container'),
	eventEmitter,
});

const productsView = new ProductsView({
	element: ensureElement('main.gallery'),
	eventEmitter,
});

const basketView = new BasketView({
	element: cloneTemplate('#basket'),
	eventEmitter,
	eventHandlers: {
		onClick: () => {
			appStateModel.initOrder();
		},
	},
});

eventEmitter.on(ModalViewEvents.OPEN, () => {
	pageView.isLocked = true;
});

eventEmitter.on(ModalViewEvents.CLOSE, () => {
	pageView.isLocked = false;
});

eventEmitter.on<{
	data: { items: IProduct[] };
}>(
	RegExp(
		`${AppStateModelEvents.BASKET_UPDATE}|${AppStateModelEvents.BASKET_RESET}`
	),
	({ data }) => {
		const { items } = data;

		headerView.render({
			counter: items.length,
		});
	}
);

eventEmitter.on<{
	data: { items: IProduct[] };
}>(
	RegExp(
		`${AppStateModelEvents.BASKET_UPDATE}|${AppStateModelEvents.BASKET_INIT}`
	),
	({ data }) => {
		const { items } = data;

		const basketTotalPrice = appStateModel.getBasketPrice();

		const basketItemsViews = items.map<TViewNested<TBasketItemRenderArgs>>(
			(item, index) => {
				const basketItemView = new BasketItemView({
					element: cloneTemplate('#card-basket'),
					eventEmitter,
					eventHandlers: {
						onClick: () => {
							appStateModel.removeBasketItem(item.id);
						},
					},
				});

				const basketItemViewRenderArgs: TBasketItemRenderArgs = {
					...item,
					index: index + 1,
					price: formatPrice(item.price, CURRENCY_TITLES),
				};

				return {
					view: basketItemView,
					renderArgs: basketItemViewRenderArgs,
				};
			}
		);

		modalView.render<TBasketRenderArgs<TBasketItemRenderArgs>>({
			content: {
				view: basketView,
				renderArgs: {
					isDisabled: items.length == 0,
					price:
						basketTotalPrice == 0
							? ''
							: formatPrice(basketTotalPrice, CURRENCY_TITLES),
					items: basketItemsViews,
				},
			},
		});
	}
);

eventEmitter.on<{ data: { item: IProduct } }>(
	AppStateModelEvents.PREVIEW_UPDATE,
	({ data }) => {
		const { item } = data;

		api
			.getProduct(item.id)
			.then((product) => {
				const isProductInBasket = appStateModel.getBasketIsContains(product.id);

				const productPreviewView = new ProductPreviewView({
					element: cloneTemplate('#card-preview'),
					eventEmitter,
					eventHandlers: {
						onClick: () => {
							if (isProductInBasket) {
								appStateModel.removeBasketItem(product.id);
							} else {
								if (product.price) {
									appStateModel.addBasketItem(product);
								}
							}
						},
					},
				});

				const productPreviewViewRenderArgs: TProductPreviewRenderArgs = {
					...product,
					isDisabled: !product.price,
					price: formatPrice(product.price, CURRENCY_TITLES),
					buttonText: isProductInBasket ? 'Удалить из корзины' : 'Купить',
				};

				modalView.render<TProductPreviewRenderArgs>({
					content: {
						view: productPreviewView,
						renderArgs: productPreviewViewRenderArgs,
					},
				});
			})
			.catch((error) => {
				console.error(error);
			});
	}
);

eventEmitter.on<{ data: { items: IProduct[] } }>(
	AppStateModelEvents.PRODUCTS_UPDATE,
	({ data }) => {
		const { items } = data;

		const productsViews = items.map<TViewNested<TProductRenderArgs>>((item) => {
			const productView = new ProductView({
				element: cloneTemplate('#card-catalog'),
				eventEmitter,
				eventHandlers: {
					onClick: () => {
						appStateModel.setPreview(item);
					},
				},
			});

			const productsViewRenderArgs: TProductRenderArgs = {
				...item,
				price: formatPrice(item.price, CURRENCY_TITLES),
			};

			return {
				view: productView,
				renderArgs: productsViewRenderArgs,
			};
		});

		productsView.render<TProductRenderArgs>({
			items: productsViews,
		});
	}
);

// Событие при изменении этапа оформления заказа
eventEmitter.on<{ data: { step: TOrderStep } }>(
	AppStateModelEvents.ORDER_STEP,
	({ data }) => {
		const { step } = data;

		// Этап выбора оплаты и заполнения адреса
		if (step === 'shipment') {
			const orderShipmentView = new OrderShipmentView({
				element: cloneTemplate('#order'),
				eventEmitter,
				eventHandlers: {
					onSubmit: () => {
						appStateModel.setStep('contacts');
					},
					onInput: ({ field, value }) => {
						appStateModel.setOrderField(field as keyof IOrder, value);

						orderShipmentView.render({
							...appStateModel.getOrderInvoice(),
							errors: appStateModel.getOrderErrors(),
							isDisabled: !appStateModel.getOrderIsValid(),
						});
					},
				},
			});

			modalView.render<TOrderShipmentRenderArgs>({
				content: {
					view: orderShipmentView,
					renderArgs: {
						...appStateModel.getOrderInvoice(),
						errors: appStateModel.getOrderErrors(),
						isDisabled: !appStateModel.getOrderIsValid(),
					},
				},
			});
		}

		// Этап заполнения контактных данных
		if (step === 'contacts') {
			const orderContactsView = new OrderContactsView({
				element: cloneTemplate('#contacts'),
				eventEmitter,
				eventHandlers: {
					onSubmit: () => {
						// При сабмите формы отправляем заказ на сервер
						api
							.createOrder(appStateModel.getOrderInvoice())
							.then((data) => {
								appStateModel.resetOrder();
								appStateModel.resetBasket();

								const orderSuccessView = new OrderSuccessView({
									element: cloneTemplate('#success'),
									eventEmitter,
									eventHandlers: {
										onClick: () => {
											modalView.close();
										},
									},
								});

								modalView.render<TOrderSuccessRenderArgs>({
									content: {
										view: orderSuccessView,
										renderArgs: {
											description: `Списано ${formatPrice(
												data.total,
												CURRENCY_TITLES
											)}`,
										},
									},
								});
							})
							.catch((error) => {
								console.error(error);
							});
					},
					onInput: ({ field, value }) => {
						appStateModel.setOrderField(field as keyof IOrder, value);

						orderContactsView.render({
							...appStateModel.getOrderInvoice(),
							errors: appStateModel.getOrderErrors(),
							isDisabled: !appStateModel.getOrderIsValid(),
						});
					},
				},
			});

			modalView.render<TOrderContactsRenderArgs>({
				content: {
					view: orderContactsView,
					renderArgs: {
						...appStateModel.getOrderInvoice(),
						errors: appStateModel.getOrderErrors(),
						isDisabled: !appStateModel.getOrderIsValid(),
					},
				},
			});
		}
	}
);

// ON APP START
api
	.getProducts()
	.then((products) => {
		appStateModel.setProductsItems(products);
	})
	.catch((error) => {
		console.error(error);
	});
