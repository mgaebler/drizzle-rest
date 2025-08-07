import { CoreAdapter, ICoreAdapterOptions, IFrameworkAdapter } from '@/core/core-adapter';

// React Router types - these would typically come from 'react-router' package
// but we'll define them here to avoid dependency issues in the core library
export interface LoaderFunctionArgs {
    request: Request;
    params: Record<string, string | undefined>;
}

export interface ActionFunctionArgs {
    request: Request;
    params: Record<string, string | undefined>;
}

/**
 * React Router adapter that extends CoreRestAdapter and implements framework-specific concerns
 */
export class ReactRouterAdapter extends CoreAdapter implements IFrameworkAdapter {
    readonly name = 'react-router';

    constructor(options: ICoreAdapterOptions) {
        super(options);
    }

    /**
     * Create a React Router loader function that uses this adapter for GET requests
     */
    createLoader() {
        return async ({ request }: LoaderFunctionArgs) => {
            try {
                // Handle the request using the core adapter
                const webResponse = await this.handle(request);

                // Convert Web API Response to React Router response
                return this.convertToRouterResponse(webResponse);
            } catch {
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    /**
     * Create a React Router action function that uses this adapter for non-GET requests
     */
    createAction() {
        return async ({ request }: ActionFunctionArgs) => {
            try {
                // Handle the request using the core adapter
                const webResponse = await this.handle(request);

                // Convert Web API Response to React Router response
                return this.convertToRouterResponse(webResponse);
            } catch {
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    /**
     * Create a combined loader/action function that handles all HTTP methods
     */
    createHandler() {
        return async ({ request }: LoaderFunctionArgs | ActionFunctionArgs) => {
            try {
                // Handle the request using the core adapter
                const webResponse = await this.handle(request);

                // Convert Web API Response to React Router response
                return this.convertToRouterResponse(webResponse);
            } catch {
                throw new Response('Internal Server Error', { status: 500 });
            }
        };
    }

    async parseRequest(request: Request): Promise<Request> {
        // React Router already provides a standard Web API Request object
        // No conversion needed - just return it as-is
        return request;
    }

    async sendResponse(
        _response: Response,
        _frameworkRes: any
    ): Promise<void> {
        // React Router doesn't use a separate response object pattern
        // The response is returned directly from the loader/action function
        // This method is not used in the React Router adapter
        throw new Error('sendResponse should not be called for React Router adapter. Use convertToRouterResponse instead.');
    }

    /**
     * Convert Web API Response to a format suitable for React Router
     */
    private async convertToRouterResponse(response: Response): Promise<Response> {
        // React Router can handle standard Web API Response objects directly
        // but we may want to do some processing here

        if (response.status === 204) {
            // 204 No Content - return empty response
            return new Response(null, {
                status: 204,
                headers: response.headers
            });
        }

        // For other responses, return as-is since React Router handles Web API Response objects
        return response;
    }
}

/**
 * Configuration options for React Router Drizzle REST adapter.
 */
type ReactRouterDrizzleRestOptions = ICoreAdapterOptions;

/**
 * Create React Router loader and action functions for automatic REST API endpoints.
 *
 * @param options - Database, schema, and configuration options
 * @returns Object with loader and action functions for React Router routes
 */
export const createReactRouterDrizzleRestAdapter = (
    options: ReactRouterDrizzleRestOptions
) => {
    // Create the React Router adapter (which extends CoreRestAdapter)
    const adapter = new ReactRouterAdapter(options);

    return {
        /**
         * Loader function for handling GET requests
         */
        loader: adapter.createLoader(),

        /**
         * Action function for handling POST, PUT, PATCH, DELETE requests
         */
        action: adapter.createAction(),

        /**
         * Combined handler function for handling all HTTP methods
         * Use this if you want a single function for both loader and action
         */
        handler: adapter.createHandler(),

        /**
         * The adapter instance for advanced usage
         */
        adapter
    };
};

/**
 * Create a React Router route configuration object with REST endpoints.
 *
 * @param path - The base path for the REST endpoints (e.g., "/api/*")
 * @param options - Database, schema, and configuration options
 * @returns React Router route configuration object
 */
export const createReactRouterDrizzleRestRoute = (
    path: string,
    options: ReactRouterDrizzleRestOptions
) => {
    const { loader, action } = createReactRouterDrizzleRestAdapter(options);

    return {
        path,
        loader,
        action,
        // Optional: You can add other route properties here
        // like errorBoundary, shouldRevalidate, etc.
    };
};
