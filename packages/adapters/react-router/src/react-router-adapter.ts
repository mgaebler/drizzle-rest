import { CoreAdapter, ICoreAdapterOptions, IFrameworkAdapter } from '@drizzle-rest/core';

export interface LoaderFunctionArgs {
    request: Request;
    params: Record<string, string | undefined>;
}

export interface ActionFunctionArgs {
    request: Request;
    params: Record<string, string | undefined>;
}

export class ReactRouterAdapter extends CoreAdapter implements IFrameworkAdapter {
    readonly name = 'react-router';

    constructor(options: ICoreAdapterOptions) {
        super(options);
    }

    createLoader() {
        return async ({ request }: LoaderFunctionArgs) => {
            try {
                const webResponse = await this.handle(request);
                return this.convertToRouterResponse(webResponse);
            } catch {
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    createAction() {
        return async ({ request }: ActionFunctionArgs) => {
            try {
                const webResponse = await this.handle(request);
                return this.convertToRouterResponse(webResponse);
            } catch {
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    createHandler() {
        return async ({ request }: LoaderFunctionArgs | ActionFunctionArgs) => {
            try {
                const webResponse = await this.handle(request);
                return this.convertToRouterResponse(webResponse);
            } catch {
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    async parseRequest(request: Request): Promise<Request> {
        return request;
    }

    async sendResponse(_response: Response, _frameworkRes: any): Promise<void> {
        throw new Error('sendResponse should not be called for React Router adapter. Use convertToRouterResponse instead.');
    }

    private async convertToRouterResponse(response: Response): Promise<Response> {
        if (response.status === 204) {
            return new Response(null, {
                status: 204,
                headers: response.headers
            });
        }
        return response;
    }
}

export const createReactRouterDrizzleRestAdapter = (
    options: ICoreAdapterOptions
) => {
    const adapter = new ReactRouterAdapter(options);
    return {
        loader: adapter.createLoader(),
        action: adapter.createAction(),
        handler: adapter.createHandler(),
        adapter
    };
};

export const createReactRouterDrizzleRestRoute = (
    path: string,
    options: ICoreAdapterOptions
) => {
    const { loader, action } = createReactRouterDrizzleRestAdapter(options);
    return {
        path,
        loader,
        action,
    };
};
