type TApiPostMethods = 'POST' | 'PUT' | 'DELETE';

type TApiListResponse<T> = {
	total: number;
	items: T[];
};

class API {
        readonly baseUrl: string;
        protected options: RequestInit;

        constructor(baseUrl: string, options: RequestInit = {}) {
            this.baseUrl = baseUrl;
            this.options = {
                headers: {
                    'Content-Type': 'application/json',
                    ...((options.headers as object) ?? {}),
                },
            };
        }

        protected handleResponse(response: Response): Promise<object> {
            if (response.ok) return response.json();
            else
                return response
                    .json()
                    .then((data) => Promise.reject(data.error ?? response.statusText));
        }

        get(uri: string) {
            return fetch(this.baseUrl + uri, {
                ...this.options,
                method: 'GET',
            }).then(this.handleResponse);
        }

        post(uri: string, data: object, method: TApiPostMethods = 'POST') {
            return fetch(this.baseUrl + uri, {
                ...this.options,
                method,
                body: JSON.stringify(data),
            }).then(this.handleResponse);
        }
}

export { API, TApiPostMethods, TApiListResponse };
