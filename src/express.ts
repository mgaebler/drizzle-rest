import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { ExpressAdapter } from './adapters/express-adapter';
import { CoreDrizzleRestAdapter, CoreDrizzleRestAdapterOptions } from './core/adapter';
import { CoreHookContext, OperationType } from './core/hook-context';
import { HookContext } from './core/utils/hook-context';
import { Logger } from './utils/logger';

interface TableHooks {
    beforeOperation?: (context: any) => Promise<void>;
    afterOperation?: (context: any, result: any) => Promise<any>;
}

/**
 * Transform Express-style hooks to be compatible with the core framework-agnostic format
 */
const transformExpressHooks = (hooks: TableHooks, _adapter: ExpressAdapter): TableHooks => {
    const transformedHooks: TableHooks = {};

    if (hooks.beforeOperation) {
        const originalBeforeOperation = hooks.beforeOperation;
        transformedHooks.beforeOperation = async (context: CoreHookContext) => {
            // Create Express-style context for backward compatibility
            const expressContext: HookContext = {
                req: {
                    method: context.request.method,
                    url: context.request.url,
                    headers: context.request.headers,
                    params: context.request.params,
                    query: context.request.query,
                    body: context.request.body,
                    user: context.request.user,
                    requestId: context.request.requestId
                } as any,
                res: undefined as any, // Not needed for most hooks
                operation: context.operation,
                table: context.table,
                record: context.record,
                recordId: context.recordId,
                filters: context.filters,
                metadata: context.metadata
            };

            await originalBeforeOperation(expressContext);
        };
    }

    if (hooks.afterOperation) {
        const originalAfterOperation = hooks.afterOperation;
        transformedHooks.afterOperation = async (context: CoreHookContext, result: any) => {
            // Create Express-style context for backward compatibility
            const expressContext: HookContext = {
                req: {
                    method: context.request.method,
                    url: context.request.url,
                    headers: context.request.headers,
                    params: context.request.params,
                    query: context.request.query,
                    body: context.request.body,
                    user: context.request.user,
                    requestId: context.request.requestId
                } as any,
                res: undefined as any, // Not needed for most hooks
                operation: context.operation,
                table: context.table,
                record: context.record,
                recordId: context.recordId,
                filters: context.filters,
                metadata: context.metadata
            };

            return await originalAfterOperation(expressContext, result);
        };
    }

    return transformedHooks;
};

/**
 * Express-specific adapter options (maintains backward compatibility)
 */
export interface ExpressDrizzleRestAdapterOptions {
    /** The Drizzle database instance. */
    db: PgliteDatabase<any>;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /** Detailed configuration per table. */
    tableOptions?: {
        [tableName: string]: {
            disabledEndpoints?: Array<OperationType>;
            hooks?: TableHooks;
        }
    };

    /** Logger instance to use (create with createLogger() if needed) */
    logger?: Logger;
}

/**
 * Create an Express router using the framework-agnostic core
 */
export const createExpressDrizzleRestAdapter = (
    options: ExpressDrizzleRestAdapterOptions
): express.Router => {
    const router = express.Router();
    const adapter = new ExpressAdapter();

    // Transform Express hooks to core-compatible format for backward compatibility
    const transformedTableOptions = options.tableOptions ? { ...options.tableOptions } : undefined;
    if (transformedTableOptions) {
        Object.keys(transformedTableOptions).forEach(tableName => {
            const tableConfig = transformedTableOptions[tableName];
            if (tableConfig?.hooks) {
                tableConfig.hooks = transformExpressHooks(tableConfig.hooks, adapter);
            }
        });
    }

    // Create core adapter with Express adapter and transformed hooks
    const coreOptions: CoreDrizzleRestAdapterOptions = {
        ...options,
        tableOptions: transformedTableOptions,
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
