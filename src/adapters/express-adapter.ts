import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { CoreRestAdapter, ICoreRestAdapterOptions, IFrameworkAdapter } from '../core/adapter';
import { IAdapterRequest, IAdapterResponse } from '../core/types/adapter.types';

// Re-export for convenience
export type { HookContext } from './express-types';

/**
 * Express.js adapter that extends CoreRestAdapter and implements framework-specific concerns
 */
export class ExpressAdapter extends CoreRestAdapter implements IFrameworkAdapter {
    readonly name = 'express';

    constructor(options: ICoreRestAdapterOptions) {
        super(options);
    }

    /**
     * Create an Express route handler that uses this adapter
     */
    createExpressHandler() {
        return async (req: ExpressRequest, res: ExpressResponse) => {
            try {
                // Parse the Express request into our internal format
                const adapterRequest = await this.parseRequest(req);

                // Handle the request using the core adapter
                const adapterResponse = await this.handle(adapterRequest);

                // Send the response back through Express
                await this.sendResponse(adapterResponse, res);
            } catch (error: any) {
                this.getLogger().error({
                    error: error.message,
                    url: req.url,
                    method: req.method
                }, 'Express handler error');

                res.status(500).json({
                    error: 'Internal Server Error'
                });
            }
        };
    }

    async parseRequest(req: ExpressRequest): Promise<IAdapterRequest> {
        // Convert Express headers to plain object
        const headers: Record<string, string> = {};
        Object.entries(req.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                headers[key] = value;
            } else if (Array.isArray(value)) {
                headers[key] = value.join(', ');
            }
        });

        return {
            method: req.method,
            url: req.url, // Use req.url instead of originalUrl to get path relative to mounted router
            headers,
            params: req.params || {},
            query: req.query || {},
            body: req.body,
            requestId: req.headers['x-request-id'] as string
        };
    }

    async sendResponse(
        response: IAdapterResponse,
        res: ExpressResponse
    ): Promise<void> {
        // Set headers
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        // Send response
        res.status(response.status).json(response.body);
    }
}
