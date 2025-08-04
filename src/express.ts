import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { ExpressAdapter } from './adapters/express-adapter';
import { CoreRestAdapter, ICoreRestAdapterOptions } from './core/adapter';

/**
 * Configuration options for Express Drizzle REST adapter.
 */
type ExpressDrizzleRestOptions = ICoreRestAdapterOptions;

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

    // Automatically create the Express framework adapter
    const adapter = new ExpressAdapter();

    const coreAdapter = new CoreRestAdapter(options);

    // Register Express routes for each route the core adapter handles
    // This approach avoids the issue with router.use('*', ...) normalizing paths to '/'
    router.all('*', async (req: ExpressRequest, res: ExpressResponse, next) => {
        try {
            // Convert Express request to our internal format
            const apiRequest = await adapter.parseRequest(req);

            // Handle with core adapter
            const apiResponse = await coreAdapter.handle(apiRequest);

            // Send response through Express adapter
            await adapter.sendResponse(apiResponse, res);

        } catch (error) {
            next(error);
        }
    });

    return router;
};
