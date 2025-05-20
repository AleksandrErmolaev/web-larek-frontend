# Проектная работа "Веб-ларек"

Стек: HTML, SCSS, TS, Webpack

Структура проекта:
- src/ — исходные файлы проекта
- src/components/ — папка с JS компонентами
- src/components/base/ — папка с базовыми компонентами
- src/models/ — папка с JS моделями
- src/models/base/ — папка с базовыми моделями

Важные файлы:
- src/pages/index.html — HTML-файл главной страницы
- src/types/index.ts — файл с типами
- src/index.ts — точка входа приложения
- src/scss/styles.scss — корневой файл стилей
- src/utils/constants.ts — файл с константами
- src/utils/utils.ts — файл с утилитами

## Установка и запуск

Перед установкой и запуском проекта необходимо проверить наличие файла .env с ключем `API_ORIGIN`, который указывает на адрес сервера API:

```
API_ORIGIN=https://larek-api.nomoreparties.co 
```

Для установки и запуска проекта необходимо выполнить команды

```
npm install
npm run start
```

или

```
yarn
yarn start
```
## Сборка

```
npm run build
```

или

```
yarn build
```

## Общая концепция работы приложения

Приложение основано на упрощенной версии шаблона проектирования MVP. В данном контексте все приложение содержит общий "Presenter", который координирует работу всех View и Model через событийно-ориентированный подход, используя механизм сообщений, которые возникают в результате определенных событий внутри отображений и моделей 

Список доступных по умолчанию событий, а также данные, которые передаются в рамках события описаны ниже для конкретного View или Model  

Для описания товара используется интерфейс `IProduct`:

```ts
interface IProduct {
	id: string;
	description: string;
	image: string;
	title: string;
	category: string;
	price: number | null;
}
```

Для описания возможных способов оплаты заказа используется тип `TOrderPayment`:

```ts
type TOrderPayment = 'cash' | 'card';
```

Для описания заказа используется интерфейс `IOrder`:

```ts
interface IOrder {
	items: IProduct[];
	payment: TOrderPayment;
	address: string;
	email: string;
	phone: string;
}
```

При оформлении заказа, формируется специальный объект для работы с API типа `TOrderInvoice`:

```ts
type TOrderInvoice = Omit<IOrder, 'items'> & {
	items: string[];
	total: number;
};
```

Для отслеживания текущего этапа заказа используется тип `TOrderStep`:

```ts
type TOrderStep = 'shipment' | 'contacts';
```

## Базовые и связующие блоки 

### Базовый класс `API`

Реализует базовый набор сетевых операций с серверным API (получение и отправка данных) 

В качестве набора HTTP методов использует тип `TApiPostMethods`:

```ts
type TApiPostMethods = 'POST' | 'PUT' | 'DELETE'
```

### Базовый класс `EventEmitter`

Обеспечивает работу событий. Его функции: возможность установить и снять слушателей событий, вызвать слушателей при возникновении события

Реализует интерфейс `IEvents`, использует типы `TEmitterEvent`, `TSubscriber`, `TEventName`:

```ts
type TEventName = string | RegExp;

type TSubscriber = Function;

type TEmitterEvent = {
	eventName: string;
	data: unknown;
};

interface IEvents {
	on<T extends object>(event: TEventName, callback: (data: T) => void): void;
	emit<T extends object>(event: string, data?: T): void;
	trigger<T extends object>(
		event: string,
		context?: Partial<T>
	): (data: T) => void;
}
```

### Абстрактный класс `Model`

Специальный абстрактный класс, определяющий конструктор всех моделей приложения (который принимает часть данных дженерика, привязанного к интерфейсу модели, а также инстанс брокера событий, который реализует `IEvents`), а также метод `emitChanges` для сообщения об изменении внутренних данных используя `EventEmitter`

### Абстрактный класс `View` 

Специальный абстрактный класс, определяющий конструктор всех отображений приложения, а также метод для рендера `render` привязанного к отображению DOM элемента с определенным набором параметров `args`, также содержит список привязанных к отображению событий и брокер событий для сообщений о внутренних событиях

Конструктор принимает в качестве аргумента специальный тип `TViewConstructionArgs`, содержащий DOM элемент, привязанный к View, брокер и список доступных событий:

```ts
type TViewConstructionArgs<
	Element extends HTMLElement = HTMLElement,
	EventHandlers extends object = object
> = {
	element: Element;
	eventEmitter: IEvents;
	eventHandlers?: EventHandlers;
};
```

Так как View внутри себя может содержать другие View, приложен специальный тип `TViewNested`, который описывает способ хранения дочерних View:

```ts
type TViewNested<RenderArgs extends object = object> = {
	view: IView | HTMLElement;
	renderArgs?: RenderArgs;
};
```

## Модели данных (Model)

### Класс `AppState`

Модель данных приложения. По сути является неким глобальным хранилищем данных с набором методов для контролирования 
общего процесса работы приложения (добавление товаров в корзину, детальный просмотр товара, заполнение полей заказа и тд). В данном случае выполняет роль распределителя между товарами, корзиной и заказом

Содержит поля интерфейса `IAppState`:

```ts
interface IAppState {
	preview: IProduct;
	basket: Set<IProduct>;
	products: IProduct[];
	order: IOrder;
}
```

Имеет базовый набор методов для управления приложением:

```ts
// Установка этапа оформления заказа
setStep(value: TOrderStep) {}

// Установка поля заказа
setOrderField(field: keyof IOrder, value: unknown) {}

// Проверка валидности текущего заказа
getOrderIsValid() {}

// Получение ошибок текущего заказа
getOrderErrors() {}

// Получение полей заказа в виде для взаимодействия с API
getOrderInvoice() {}

// Инициализация нового заказа
initOrder() {}

// Сброс всех полей заказа
resetOrder() {}

// Установка товаров каталога
setProductsItems(value: IProduct[]) {}

// Проверка на наличие товара в корзине
getBasketIsContains(id: string) {}

// Добавление товара в корзину
addBasketItem(value: IProduct) {}

// Удаление товара из корзины
removeBasketItem(id: string) {}

// Сброс текущего состояния корзины
resetBasket() {}

// Инициализация корзины
initBasket() {}

// Получение цены позиций в корзине
getBasketPrice() {}

// Установка текущего просматриваемого элемента
setPreview(value: IProduct) {}
```

Доступные события для использования объектом класса `EventEmitter` описаны перечислением `AppStateEvents`:

```ts
enum AppStateEvents {
	// Событие возникающее при изменении списка товаров каталога
	PRODUCTS_UPDATE = 'products:update',
	// Событие возникающее при изменении preview
	PREVIEW_UPDATE = 'preview:update',
	// Событие возникающее при инициализации корзины
	BASKET_INIT = 'basket:init',
	// Событие возникающее при изменении товаров в корзине
	BASKET_UPDATE = 'basket:update',
	// Событие возникающее при сбросе корзины
	BASKET_RESET = 'basket:reset',
	// Событие возникающее при изменении этапа заказа
	ORDER_STEP = 'order:step',
	// Событие возникающее при изменении поля заказа
	ORDER_UPDATE = 'order:update',
	// Событие возникающее при сбросе заказа
	ORDER_RESET = 'order:reset',
}
```

- Событие `PRODUCTS_UPDATE` возникает при вызове метода `setProductsItems` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `items` - текущий список элементов каталога (каждый элемент списка реализует интерфейс `IProduct`)

- Событие `PREVIEW_UPDATE` возникает при вызове метода `setPreview` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `item` - текущий просматриваемый товар (товар реализует интерфейс `IProduct`)

- Событие `BASKET_INIT` возникает при вызове метода `initBasket` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `items` - текущий список элементов корзины (каждый элемент списка реализует интерфейс `IProduct`)

- Событие `BASKET_UPDATE` возникает при вызове методов `addBasketItem` и `removeBasketItem` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `items` - текущий список элементов корзины (каждый элемент списка реализует интерфейс `IProduct`)

- Событие `BASKET_RESET` возникает при вызове метода `resetBasket` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `items` - текущий список элементов корзины (каждый элемент списка реализует интерфейс `IProduct`)

- Событие `ORDER_STEP` возникает при вызове метода `setStep` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `step` - текущий этап оформления заказа (шаг принадлежит типу `TOrderStep`)

- Событие `ORDER_UPDATE` возникает при вызове метода `setOrderField` и в качестве данных 
передает объект с полем `data`, поле `data` - объект, содержит поле `field` - поле заказа (поле является ключем интерфейса `IOrder`) и поле `value` - значение поля заказа

- Событие `ORDER_RESET` возникает при вызове метода `resetOrder`, не содержит передаваемых данных

## Специальные компоненты 

Данный набор компонентов необходим для работы с API и другими службами

### Класс `ShopAPI`

Специальный компонент для взаимодействия с API магазина (получение списка товара(ов), оформление заказа)

Наследуется от базового класса `API`, при оформлении заказа использует `TOrderInvoice`

## Отображения (View)

### Глобальные компоненты 

Данный набор компонентов необходим для работы со страницей

#### Класс `Page` 

Отображение самой страницы. Контролирует возможность скроллинга 

Наследуется от `View`. При рендеринге использует поля типа `TPageRenderArgs`:

```ts
type TPageRenderArgs = {
	isLocked: boolean;
};
```

#### Класс `Header`

Отображение хедера страницы. Содержит отображение счетчика корзины, а также предоставляет возможность по клику на иконку корзины совершать определенные действия

Наследуется от `View`. При рендеринге использует поля типа `THeaderRenderArgs`:

```ts
type THeaderRenderArgs = {
	counter: number;
};
```

Доступный список событий описан типом `THeaderEventHandlers`:

```ts
type THeaderEventHandlers = {
	onClick?: (args: { _event: MouseEvent }) => void;
};
```

#### Класс `Modal`

Отображение модального окна. Предоставляет методы для открытия и закрытия модального окна страницы, а также контролирует собственное содержимое

Наследуется от `View`. При рендеринге использует поля типа `TModalRenderArgs`:

```ts
type TModalRenderArgs<T extends object> = {
	content: TViewNested<T>;
};
```

Имеет базовый набор методов для управления активностью модального окна:

```ts
// Открыть модальное окно
open() {}
// Закрыть модальное окно
close() {}
```

Доступные события для использования объектом класса `EventEmitter` описаны перечислением `ModalEvents`:

```ts
enum ModalEvents {
	// Закрытие модального окна
	CLOSE = 'modal:close',
	// Открытие модального окна
	OPEN = 'modal:open',
}
```

- Событие `CLOSE` возникает при вызове метода `open`, не содержит передаваемых данных

- Событие `OPEN` возникает при вызове метода `close`, не содержит передаваемых данных

#### Класс `Form` 

Отображение формы. Контролирует отображение ошибок валидации формы, предоставляет возможности по прослушиванию событий отправки формы, а также внесения изменений в поля формы 

Наследуется от `View`. При рендеринге использует поля типа `TFormRenderArgs`:

```ts
type TFormRenderArgs = {
	isDisabled: boolean;
	errors: string[];
};
```

Доступный список событий описан типом `TFormEventHandlers`:

```ts
type TFormEventHandlers = {
	onSubmit?: (args: { _event: SubmitEvent }) => void;
	onInput?: (args: {
		_event: InputEvent;
		field: string;
		value: unknown;
	}) => void;
};
```

### Компоненты корзины

Данный набор компонентов необходим для работы с пользовательской корзиной 

#### Класс `Basket`

Отображение корзины. Содержит набор позиций корзины, общую сумму позиций, а также предоставляет возможность совершения действий по клику на кнопку оформления

Наследуется от `View`. При рендеринге использует поля типа `TBasketRenderArgs`:

```ts
type TBasketRenderArgs<T extends object> = {
	items: TViewNested<T>[];
	price: string;
	isDisabled: boolean;
};
```

Доступный список событий описан типом `TBasketEventHandlers`:

```ts
type TBasketEventHandlers = {
	onClick?: (args: { _event: MouseEvent }) => void;
};
```

#### Класс `BasketItem`

Отображение позиции в корзине. Отображает характеристики товара позиции, предоставляет возможность совершать действия по клику на иконку удаления позиции

Наследуется от `View`. При рендеринге использует поля типа `TBasketItemRenderArgs`:

```ts
type TBasketItemRenderArgs = {
	index: number;
	title: string;
	price: string;
};
```

Доступный список событий описан типом `TBasketItemEventHandlers`:

```ts
type TBasketItemEventHandlers = {
	onClick?: (args: { _event: MouseEvent }) => void;
};
```

### Компоненты заказа 

Данный набор компонентов необходим для работы с пользовательским заказов 

#### Класс `OrderShipment`

Отображение формы заказа с полями способ оплаты, адрес доставки. Наследует возможности компонента формы, управляет состоянием полей способа оплаты и адреса доставки, предоставляет возможность при отправке формы совершать определенные действия

Наследуется от `Form`. При рендеринге использует поля типа `TOrderShipmentRenderArgs`:

```ts
type TOrderShipmentRenderArgs = {
	payment: string;
	address: string;
} & TFormRenderArgs;
```

Использует список событий типа `TFormEventHandlers`

#### Класс `OrderContacts`

Отображение формы заказа с полями email, телефон. Наследует возможности компонента формы, управляет состоянием полей email и адреса телефона, предоставляет возможность при отправке формы совершать определенные действия

Наследуется от `Form`. При рендеринге использует поля типа `TOrderContactsRenderArgs`:

```ts
type TOrderContactsRenderArgs = {
	email: string;
	phone: string;
} & TFormRenderArgs
```

Использует список событий типа `TFormEventHandlers`

#### Класс `OrderSuccess`

Отображение успешности оформления заказа. Содержит информацию о потраченных ресурсах при успешном оформлении заказа

Наследуется от `View`. При рендеринге использует поля типа `TOrderSuccessRenderArgs`:

```ts
type TOrderSuccessRenderArgs = {
	description: string;
};
```

Доступный список событий описан типом `TOrderSuccessEventHandlers`:

```ts
type TOrderSuccessEventHandlers = {
	onClick?: (args: { _event: MouseEvent }) => void;
};
```

### Компоненты товаров

Данный набор компонентов необходим для работы с отображением товаров магазина

#### Класс `Products`

Отображение списка товаров. Содержит набор текущих товаров магазина

Наследуется от `View`. При рендеринге использует поля типа `TProductsRenderArgs`:

```ts
type TProductsRenderArgs<T extends object> = {
	items: TViewNested<T>[];
};
```

#### Класс `Product`

Отображение товара. Содержит частичные характеристики товара, а также предоставляет возможность по клику на товар совершать определенные действия

Наследуется от `View`. При рендеринге по умолчанию использует поля типа `TProductRenderArgs`:

```ts
type TProductRenderArgs = Pick<
	IProduct,
	'image' | 'title' | 'category'
> & {
	price: string;
}
```

Доступный список событий по умолчанию описан типом `TProductEventHandlers`:

```ts
type TProductEventHandlers = {
	onClick?: (args: { _event: MouseEvent }) => void;
}
```

#### Класс `ProductPreview`

Детальное отображение товара. Содержит полные характеристики товара, а также предоставляет возможность по клику на кнопку совершать определенные действия

Наследуется от `Product`. При рендеринге использует поля типа `TProductPreviewRenderArgs`:

```ts
type TProductPreviewRenderArgs = {
	description: string;
	buttonText: string;
	isDisabled: boolean;
} & TProductRenderArgs
```

Использует список событий типа `TProductEventHandlers`