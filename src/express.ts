import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { ExpressAdapter } from './adapters/express-adapter';
import { CoreDrizzleRestAdapter, CoreDrizzleRestAdapterOptions } from './core/adapter';

/**
 * Create an Express router using the framework-agnostic core
 */
export const createExpressDrizzleRestAdapter = (
    options: Omit<CoreDrizzleRestAdapterOptions, 'adapter'>
): express.Router => {
    const router = express.Router();
    const adapter = new ExpressAdapter();

    // Create core adapter with Express adapter
    const coreOptions: CoreDrizzleRestAdapterOptions = {
        ...options,
        adapter
    };

    const coreAdapter = new CoreDrizzleRestAdapter(coreOptions);

    // Register Express routes for each route the core adapter handles
    // This approach avoids the issue with router.use('*', ...) normalizing paths to '/'
    router.all('*', async (req: ExpressRequest, res: ExpressResponse, next) => {
        try {
            // Convert Express request to our internal format
            const drizzleRequest = await adapter.parseRequest(req);

            // Handle with core adapter
            const drizzleResponse = await coreAdapter.handle(drizzleRequest);

            // Send response through Express adapter
            await adapter.sendResponse(drizzleResponse, res);

        } catch (error) {
            next(error);
        }
    });

    return router;
};
