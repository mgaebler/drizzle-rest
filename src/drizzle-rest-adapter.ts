import { getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import express from 'express';

import {
    ActionContext,
    createAction,
    deleteAction,
    getManyAction,
    getOneAction,
    replaceAction,
    updateAction
} from './actions';
import { ErrorHandler } from './utils/error-handler';
import { HookContext, OperationType } from './utils/hook-context';
import { createLogger, Logger, LoggerOptions } from './utils/logger';
import { requestLoggingMiddleware, RequestLogOptions } from './utils/request-logger';
import { SchemaInspector } from './utils/schema-inspector';

// A more specific type can be used if the schema is known.
// Using `any` for the schema makes the adapter more generic.
type DrizzleDb = PgliteDatabase<any>;

interface TableHooks {
    beforeOperation?: (context: HookContext) => Promise<void>;
    afterOperation?: (context: HookContext, result: any) => Promise<any>;
}

export interface DrizzleRestAdapterOptions {
    /** The Drizzle database instance. */
    db: DrizzleDb;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /** Detailed configuration per table. */
    tableOptions?: {
        [tableName: string]: {
            disabledEndpoints?: Array<OperationType>;
            hooks?: TableHooks;
        }
    };

    /** Security configuration */
    security?: {
        /** Maximum request body size in bytes (default: 1MB) */
        maxBodySize?: number;
        /** Enable request sanitization (default: true) */
        sanitizeInput?: boolean;
        /** Rate limiting configuration */
        rateLimit?: {
            windowMs: number;
            max: number;
        };
    };

    /** Logging configuration */
    logging?: {
        /** Logger instance to use (if not provided, creates a default one) */
        logger?: Logger;
        /** Logger configuration options */
        loggerOptions?: LoggerOptions;
        /** Request logging configuration */
        requestLogging?: RequestLogOptions & {
            /** Enable request/response logging middleware */
            enabled?: boolean;
        };
    };
}

export const createDrizzleRestAdapter = (options: DrizzleRestAdapterOptions) => {
    const router = express.Router();
    const { db, schema, tableOptions, logging } = options;

    // Set up logging
    const logger = logging?.logger || createLogger(logging?.loggerOptions || {});
    ErrorHandler.setLogger(logger);

    logger.info({
        tablesCount: Object.keys(schema).length,
        hasRequestLogging: !!logging?.requestLogging?.enabled
    }, 'Initializing Drizzle REST Adapter');

    // Add request logging middleware if enabled
    if (logging?.requestLogging?.enabled !== false) {
        const requestLogOptions = logging?.requestLogging || {};
        router.use(requestLoggingMiddleware(logger, requestLogOptions));
        logger.debug('Request logging middleware enabled');
    }

    // Use schema introspection instead of simple iteration
    const inspector = new SchemaInspector(schema);
    const tables = inspector.extractTables();

    logger.debug({
        tables: tables.map(t => ({
            name: t.name,
            primaryKey: t.primaryKey,
            columnsCount: t.columns.length
        }))
    }, 'Schema inspection completed');

    // Create a map for quick table metadata lookup
    const tablesMetadataMap = new Map();
    tables.forEach(table => tablesMetadataMap.set(table.name, table));

    tables.forEach(tableMetadata => {
        const table = schema[tableMetadata.name];
        const resourcePath = `/${tableMetadata.name}`;
        const itemPath = `${resourcePath}/:id`;

        logger.debug({
            table: tableMetadata.name,
            resourcePath,
            primaryKey: tableMetadata.primaryKey
        }, 'Setting up routes for table');

        // Get primary key column name(s)
        const primaryKeyColumns = tableMetadata.primaryKey;
        if (primaryKeyColumns.length === 0) {
            logger.warn({
                table: tableMetadata.name
            }, 'Skipping table: no primary key found');
            return;
        }

        // For now, handle single-column primary keys (composite keys in future)
        const primaryKeyColumn = primaryKeyColumns[0];
        const columns = getTableColumns(table);
        const tableConfig = tableOptions?.[tableMetadata.name];

        // GET /<table-name>
        if (!tableConfig?.disabledEndpoints?.includes(OperationType.GET_MANY)) {
            router.get(resourcePath, async (req, res) => {
                const actionContext: ActionContext = {
                    db,
                    table,
                    tableMetadata,
                    primaryKeyColumn,
                    columns,
                    schema,
                    tablesMetadataMap,
                    tableConfig,
                    logger
                };

                await getManyAction(req, res, actionContext);
            });
        }

        // POST /<table-name>
        if (!tableConfig?.disabledEndpoints?.includes(OperationType.CREATE)) {
            router.post(resourcePath, async (req, res) => {
                const actionContext: ActionContext = {
                    db,
                    table,
                    tableMetadata,
                    primaryKeyColumn,
                    columns,
                    schema,
                    tablesMetadataMap,
                    tableConfig,
                    logger
                };

                await createAction(req, res, actionContext);
            });
        }

        // GET /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes(OperationType.GET_ONE)) {
            router.get(itemPath, async (req, res) => {
                const actionContext: ActionContext = {
                    db,
                    table,
                    tableMetadata,
                    primaryKeyColumn,
                    columns,
                    schema,
                    tablesMetadataMap,
                    tableConfig,
                    logger
                };

                await getOneAction(req, res, actionContext);
            });
        }

        // PATCH /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes(OperationType.UPDATE)) {
            router.patch(itemPath, async (req, res) => {
                const actionContext: ActionContext = {
                    db,
                    table,
                    tableMetadata,
                    primaryKeyColumn,
                    columns,
                    schema,
                    tablesMetadataMap,
                    tableConfig,
                    logger
                };

                await updateAction(req, res, actionContext);
            });
        }

        // PUT /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes(OperationType.REPLACE)) {
            router.put(itemPath, async (req, res) => {
                const actionContext: ActionContext = {
                    db,
                    table,
                    tableMetadata,
                    primaryKeyColumn,
                    columns,
                    schema,
                    tablesMetadataMap,
                    tableConfig,
                    logger
                };

                await replaceAction(req, res, actionContext);
            });
        }

        // DELETE /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes(OperationType.DELETE)) {
            router.delete(itemPath, async (req, res) => {
                const actionContext: ActionContext = {
                    db,
                    table,
                    tableMetadata,
                    primaryKeyColumn,
                    columns,
                    schema,
                    tablesMetadataMap,
                    tableConfig,
                    logger
                };

                await deleteAction(req, res, actionContext);
            });
        }
    });

    logger.info({
        tablesProcessed: tables.length,
        routesRegistered: tables.length * 5 // approximate, depends on disabled endpoints
    }, 'Drizzle REST Adapter initialization completed');

    return router;
};