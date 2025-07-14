import { eq, getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { createInsertSchema } from 'drizzle-zod';
import express from 'express';

import { ErrorHandler } from './utils/error-handler';
import { createLogger, Logger, LoggerOptions } from './utils/logger';
import { OpenAPIGenerator } from './utils/openapi-generator';
import { QueryBuilder } from './utils/query-builder';
import { QueryParser } from './utils/query-parser';
import { requestLoggingMiddleware, RequestLogOptions } from './utils/request-logger';
import { SchemaInspector } from './utils/schema-inspector';

// A more specific type can be used if the schema is known.
// Using `any` for the schema makes the adapter more generic.
type DrizzleDb = PgliteDatabase<any>;

export interface DrizzleRestAdapterOptions {
    /** The Drizzle database instance. */
    db: DrizzleDb;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /** Detailed configuration per table. */
    tableOptions?: {
        [tableName: string]: {
            disabledEndpoints?: Array<'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'REPLACE' | 'DELETE'>;
        }
    };

    /** OpenAPI documentation generation (auto-inferred from schema) */
    openapi?: {
        info?: {
            title?: string; // defaults to 'REST API'
            version?: string; // defaults to '1.0.0'
            description?: string;
        };
        // All paths, schemas, parameters automatically inferred from Drizzle schema
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
    const { db, schema, tableOptions, openapi, logging } = options;

    // Set up logging
    const logger = logging?.logger || createLogger(logging?.loggerOptions || {});
    ErrorHandler.setLogger(logger);

    logger.info({
        tablesCount: Object.keys(schema).length,
        hasOpenApi: !!openapi,
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

    // Set up OpenAPI documentation if enabled
    if (openapi) {
        logger.info('Setting up OpenAPI documentation');

        const disabledEndpointsMap = new Map();
        if (tableOptions) {
            Object.entries(tableOptions).forEach(([tableName, config]) => {
                if (config.disabledEndpoints) {
                    disabledEndpointsMap.set(tableName, config.disabledEndpoints);
                    logger.debug({
                        table: tableName,
                        disabledEndpoints: config.disabledEndpoints
                    }, 'Table endpoints disabled');
                }
            });
        }

        const openApiGenerator = new OpenAPIGenerator(tablesMetadataMap, disabledEndpointsMap);
        const openApiSpec = openApiGenerator.generateSpec(openapi.info);

        // Serve OpenAPI JSON specification
        router.get('/openapi.json', (req, res) => {
            logger.debug({ requestId: (req as any).requestId }, 'Serving OpenAPI specification');
            res.json(openApiSpec);
        });

        logger.info('OpenAPI documentation available at /openapi.json');
    }

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
        if (!tableConfig?.disabledEndpoints?.includes('GET_MANY')) {
            router.get(resourcePath, async (req, res) => {
                const requestId = (req as any).requestId;
                const startTime = Date.now();

                try {
                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        query: req.query
                    }, 'Processing GET_MANY request');

                    const params = QueryParser.parseQueryParams(req);
                    const queryBuilder = new QueryBuilder(db, table, columns, schema, tablesMetadataMap, tableMetadata.name);

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        parsedParams: {
                            filters: params.filters,
                            sort: params.sort,
                            pagination: params.pagination,
                            embed: params.embed
                        }
                    }, 'Parsed query parameters');

                    const { query, embedKeys } = queryBuilder.buildSelectQuery(params);
                    let data = await query;

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        recordsCount: data.length,
                        hasEmbeds: embedKeys && embedKeys.length > 0
                    }, 'Query executed');

                    // Apply embeds if requested
                    if (embedKeys && embedKeys.length > 0) {
                        logger.debug({
                            requestId,
                            table: tableMetadata.name,
                            embedKeys
                        }, 'Applying embeds');

                        data = await queryBuilder.applyEmbeds(data, embedKeys);
                    }

                    const totalCount = await queryBuilder.getTotalCount(params.filters);
                    const duration = Date.now() - startTime;

                    logger.info({
                        requestId,
                        table: tableMetadata.name,
                        recordsCount: data.length,
                        totalCount,
                        duration,
                        hasFilters: Object.keys(params.filters).length > 0,
                        hasSort: !!params.sort,
                        hasPagination: !!params.pagination,
                        hasEmbeds: embedKeys && embedKeys.length > 0
                    }, 'GET_MANY request completed successfully');

                    // Set X-Total-Count header
                    res.set('X-Total-Count', totalCount.toString());
                    res.json(data);
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        requestId,
                        table: tableMetadata.name,
                        duration,
                        error: error.message
                    }, 'GET_MANY request failed');

                    ErrorHandler.handleError(res, error, 'getMany', requestId);
                }
            });
        }

        // POST /<table-name>
        if (!tableConfig?.disabledEndpoints?.includes('CREATE')) {
            router.post(resourcePath, async (req, res) => {
                const requestId = (req as any).requestId;
                const startTime = Date.now();

                try {
                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        bodyKeys: Object.keys(req.body || {})
                    }, 'Processing CREATE request');

                    const insertSchema = createInsertSchema(table);
                    const validatedBody = insertSchema.parse(req.body);

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        validatedFields: Object.keys(validatedBody)
                    }, 'Request body validated');

                    const result = await db.insert(table).values(validatedBody).returning();
                    const createdRecord = (result as any[])[0];
                    const duration = Date.now() - startTime;

                    logger.info({
                        requestId,
                        table: tableMetadata.name,
                        recordId: createdRecord[primaryKeyColumn],
                        duration
                    }, 'CREATE request completed successfully');

                    res.status(201).json(createdRecord);
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        requestId,
                        table: tableMetadata.name,
                        duration,
                        error: error.message
                    }, 'CREATE request failed');

                    ErrorHandler.handleError(res, error, 'createOne', requestId);
                }
            });
        }

        // GET /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('GET_ONE')) {
            router.get(itemPath, async (req, res) => {
                const requestId = (req as any).requestId;
                const startTime = Date.now();

                try {
                    const { id } = req.params;

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        primaryKeyColumn
                    }, 'Processing GET_ONE request');

                    // Use dynamic primary key instead of hardcoded 'id'
                    if (!columns[primaryKeyColumn]) {
                        logger.error({
                            requestId,
                            table: tableMetadata.name,
                            primaryKeyColumn,
                            availableColumns: Object.keys(columns)
                        }, 'Primary key column not found');

                        return res.status(500).json({
                            error: `Primary key column '${primaryKeyColumn}' not found in table '${tableMetadata.name}'`,
                            requestId
                        });
                    }

                    const query = db.select().from(table).where(eq(columns[primaryKeyColumn], id));
                    const data = await query;
                    const duration = Date.now() - startTime;

                    if (data.length === 0) {
                        logger.info({
                            requestId,
                            table: tableMetadata.name,
                            id,
                            duration
                        }, 'GET_ONE request - record not found');

                        return ErrorHandler.handleNotFound(res, undefined, requestId);
                    }

                    logger.info({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        duration
                    }, 'GET_ONE request completed successfully');

                    res.json(data[0]);
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        requestId,
                        table: tableMetadata.name,
                        id: req.params.id,
                        duration,
                        error: error.message
                    }, 'GET_ONE request failed');

                    ErrorHandler.handleError(res, error, 'getOne', requestId);
                }
            });
        }

        // PATCH /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('UPDATE')) {
            router.patch(itemPath, async (req, res) => {
                const requestId = (req as any).requestId;
                const startTime = Date.now();

                try {
                    const { id } = req.params;

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        updateFields: Object.keys(req.body || {})
                    }, 'Processing UPDATE request');

                    const insertSchema = createInsertSchema(table);
                    const validatedBody = insertSchema.partial().parse(req.body);

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        validatedFields: Object.keys(validatedBody)
                    }, 'Update body validated');

                    // Use dynamic primary key
                    await db.update(table).set(validatedBody).where(eq(columns[primaryKeyColumn], id));

                    const updatedRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
                    const duration = Date.now() - startTime;

                    if (updatedRecord.length === 0) {
                        logger.info({
                            requestId,
                            table: tableMetadata.name,
                            id,
                            duration
                        }, 'UPDATE request - record not found after update');

                        return ErrorHandler.handleNotFound(res, undefined, requestId);
                    }

                    logger.info({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        updatedFields: Object.keys(validatedBody),
                        duration
                    }, 'UPDATE request completed successfully');

                    res.json(updatedRecord[0]);
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        requestId,
                        table: tableMetadata.name,
                        id: req.params.id,
                        duration,
                        error: error.message
                    }, 'UPDATE request failed');

                    ErrorHandler.handleError(res, error, 'updateOne', requestId);
                }
            });
        }

        // PUT /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('REPLACE')) {
            router.put(itemPath, async (req, res) => {
                const requestId = (req as any).requestId;
                const startTime = Date.now();

                try {
                    const { id } = req.params;

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        replaceFields: Object.keys(req.body || {})
                    }, 'Processing REPLACE request');

                    const insertSchema = createInsertSchema(table);

                    // For PUT, we need the full object (not partial)
                    const validatedBody = insertSchema.parse(req.body);

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        validatedFields: Object.keys(validatedBody)
                    }, 'Replace body validated');

                    // Use dynamic primary key
                    await db.update(table).set(validatedBody).where(eq(columns[primaryKeyColumn], id));

                    const updatedRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
                    const duration = Date.now() - startTime;

                    if (updatedRecord.length === 0) {
                        logger.info({
                            requestId,
                            table: tableMetadata.name,
                            id,
                            duration
                        }, 'REPLACE request - record not found after replace');

                        return ErrorHandler.handleNotFound(res, undefined, requestId);
                    }

                    logger.info({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        replacedFields: Object.keys(validatedBody),
                        duration
                    }, 'REPLACE request completed successfully');

                    res.json(updatedRecord[0]);
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        requestId,
                        table: tableMetadata.name,
                        id: req.params.id,
                        duration,
                        error: error.message
                    }, 'REPLACE request failed');

                    ErrorHandler.handleError(res, error, 'replaceOne', requestId);
                }
            });
        }

        // DELETE /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('DELETE')) {
            router.delete(itemPath, async (req, res) => {
                const requestId = (req as any).requestId;
                const startTime = Date.now();

                try {
                    const { id } = req.params;

                    logger.debug({
                        requestId,
                        table: tableMetadata.name,
                        id
                    }, 'Processing DELETE request');

                    // First check if the record exists using dynamic primary key
                    const existingRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
                    if (existingRecord.length === 0) {
                        const duration = Date.now() - startTime;

                        logger.info({
                            requestId,
                            table: tableMetadata.name,
                            id,
                            duration
                        }, 'DELETE request - record not found');

                        return ErrorHandler.handleNotFound(res, undefined, requestId);
                    }

                    await db.delete(table).where(eq(columns[primaryKeyColumn], id));
                    const duration = Date.now() - startTime;

                    logger.info({
                        requestId,
                        table: tableMetadata.name,
                        id,
                        duration
                    }, 'DELETE request completed successfully');

                    res.status(204).send();
                } catch (error: any) {
                    const duration = Date.now() - startTime;
                    logger.error({
                        requestId,
                        table: tableMetadata.name,
                        id: req.params.id,
                        duration,
                        error: error.message
                    }, 'DELETE request failed');

                    ErrorHandler.handleError(res, error, 'deleteOne', requestId);
                }
            });
        }
    });

    logger.info({
        tablesProcessed: tables.length,
        routesRegistered: tables.length * 5 // approximate, depends on disabled endpoints
    }, 'Drizzle REST Adapter initialization completed');

    return router;
};