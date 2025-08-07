import express from 'express';

import { ExpressAdapter } from './adapters/express-adapter';
import { ICoreAdapterOptions } from './core/core-adapter';

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
