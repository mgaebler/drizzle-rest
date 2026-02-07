import type { ICoreAdapterOptions, IFrameworkAdapter } from '@drizzle-rest/core';
import { CoreAdapter } from '@drizzle-rest/core';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

export class ReactRouterAdapter extends CoreAdapter implements IFrameworkAdapter {
    readonly name = 'react-router';

    createHandler() {
        return async ({ request }: LoaderFunctionArgs | ActionFunctionArgs) => {
            try {
                const webResponse = await this.handle(request);
                return webResponse;
            } catch (error) {
                console.error('Error handling request:', error);
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    async parseRequest(request: Request): Promise<Request> {
        return request;
    }

    async sendResponse(_response: Response, _frameworkRes: any): Promise<void> {
        throw new Error(
            'sendResponse should not be called for React Router adapter. Use convertToRouterResponse instead.',
        );
    }
}

export const createReactRouterDrizzleRestAdapter = (options: ICoreAdapterOptions) => {
    const adapter = new ReactRouterAdapter(options);
    return {
        handler: adapter.createHandler(),
        adapter,
    };
};
