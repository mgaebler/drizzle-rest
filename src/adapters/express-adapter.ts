import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import express from 'express';

import { CoreAdapter, ICoreAdapterOptions, IFrameworkAdapter } from '../core/core-adapter';

/**
 * Express.js adapter that extends CoreRestAdapter and implements framework-specific concerns
 */
export class ExpressAdapter extends CoreAdapter implements IFrameworkAdapter {
    readonly name = 'express';

    constructor(options: ICoreAdapterOptions) {
        super(options);
    }

    /**
     * Create an Express route handler that uses this adapter
     */
    createExpressHandler() {
        return async (req: ExpressRequest, res: ExpressResponse) => {
            try {
                // Parse the Express request into pure Web API Request
                const webRequest = await this.parseRequest(req);

                // Handle the request using the core adapter
                const webResponse = await this.handle(webRequest);

                // Send the Web API Response back through Express
                await this.sendResponse(webResponse, res);
            } catch (error: any) {
                res.status(500).json({
                    error: 'Internal Server Error'
                });
            }
        };
    }

    async parseRequest(req: ExpressRequest): Promise<Request> {
        // Build full URL (Express req.url is just the path)
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost';
        const fullUrl = `${protocol}://${host}${req.url}`;

        // Convert Express headers to Headers object
        const headers = new Headers();
        Object.entries(req.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                headers.set(key, value);
            } else if (Array.isArray(value)) {
                value.forEach(v => headers.append(key, v));
            } else if (value !== undefined) {
                headers.set(key, String(value));
            }
        });

        // Create RequestInit options
        const requestInit: RequestInit = {
            method: req.method,
            headers,
            // Don't set body for GET requests or when there's no body
            body: req.body && req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        };

        // Create and return pure Web API Request object
        return new Request(fullUrl, requestInit);
    }

    async sendResponse(
        response: Response,
        res: ExpressResponse
    ): Promise<void> {
        // Set headers from Web API Response
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        // Get response body
        const body = await response.text();
        const contentType = response.headers.get('content-type');

        // Send response
        if (response.status === 204) {
            // 204 No Content should not have a body
            res.status(204).end();
        } else if (contentType?.includes('application/json')) {
            res.status(response.status).json(JSON.parse(body));
        } else {
            res.status(response.status).send(body);
        }
    }
}
/**
 * Configuration options for Express Drizzle REST adapter.
 */
type ExpressDrizzleRestOptions = ICoreAdapterOptions;
/**
 * Create an Express router with automatic REST API endpoints for your Drizzle schema.
 *
 * @param options - Database, schema, and configuration options
 * @returns Express router with REST endpoints
 */

export const createExpressDrizzleRestAdapter = (
    options: ExpressDrizzleRestOptions
): express.Router => {
    const router = express.Router();

    // Create the Express adapter (which extends CoreRestAdapter)
    const adapter = new ExpressAdapter(options);

    // Register the Express handler for all routes
    router.all('*', adapter.createExpressHandler());

    return router;
};

