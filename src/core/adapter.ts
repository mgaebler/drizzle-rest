import { getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

import {
    coreCreateAction,
    coreDeleteAction,
    coreGetManyAction,
    coreGetOneAction,
    coreReplaceAction,
    coreUpdateAction
} from './actions';
import { ActionTypeEnum, ITableActionContext } from './actions';
import { createLogger, Logger } from './logger';
import { IRequestContext } from './types/adapter.types';
import { DrizzleDb, IRouteHandler } from './types/handler.types';
import { SchemaInspector } from './utils/schema-inspector';

// Re-export for convenience
export type { IFrameworkAdapter } from './types/adapter.types';

interface ITableHooks {
    beforeOperation?: (context: any) => Promise<void>;
    afterOperation?: (context: any, result: any) => Promise<any>;
}

interface IRestHandler {
    handle(request: Request): Promise<Response>;
}

export interface ICoreRestAdapterOptions {
    /** The Drizzle database instance. */
    db: DrizzleDb;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /** Detailed configuration per table. */
    tableOptions?: {
        [tableName: string]: {
            disabledEndpoints?: Array<ActionTypeEnum>;
            hooks?: ITableHooks;
        }
    };

    /** Logger instance to use (create with createLogger() if needed) */
    logger?: Logger;
}

/**
 * Core framework-agnostic REST adapter base class
 * Framework-specific adapters should extend this class and implement framework-specific concerns
 *
 * @example
 * ```typescript
 * // Example of creating a framework-specific adapter
 * export class MyFrameworkAdapter extends CoreRestAdapter implements IFrameworkAdapter {
 *     readonly name = 'my-framework';
 *
 *     constructor(options: ICoreRestAdapterOptions) {
 *         super(options);
 *     }
 *
 *     async parseRequest(frameworkReq: any): Promise<IAdapterRequest> {
 *         // Convert framework request to native Web API Request
 *         const protocol = frameworkReq.protocol || 'http';
 *         const host = frameworkReq.get('host') || 'localhost';
 *         const fullUrl = `${protocol}://${host}${frameworkReq.url}`;
 *
 *         // Create native Headers object
 *         const headers = new Headers();
 *         Object.entries(frameworkReq.headers).forEach(([key, value]) => {
 *             if (typeof value === 'string') headers.set(key, value);
 *         });
 *
 *         // Create native Request
 *         const nativeRequest = new Request(fullUrl, {
 *             method: frameworkReq.method,
 *             headers,
 *             body: frameworkReq.body ? JSON.stringify(frameworkReq.body) : undefined
 *         });
 *
 *         // Extend with routing properties
 *         const adapterRequest = nativeRequest as IAdapterRequest;
 *         adapterRequest.params = frameworkReq.params;
 *         adapterRequest.query = frameworkReq.query;
 *         adapterRequest.parsedBody = frameworkReq.body;
 *
 *         return adapterRequest;
 *     }
 *
 *     async sendResponse(response: IAdapterResponse, frameworkRes: any): Promise<void> {
 *         // Send response using framework's response mechanism
 *         frameworkRes.status(response.status).json(response.body);
 *     }
 * }
 * ```
 */
export abstract class CoreRestAdapter implements IRestHandler {
    private routes: Map<string, IRouteHandler> = new Map();
    private options: ICoreRestAdapterOptions;
    private logger: Logger;
    private tablesMetadataMap: Map<string, any> = new Map();

    constructor(options: ICoreRestAdapterOptions) {
        this.options = options;
        this.logger = options.logger || createLogger();

        this.logger.info({
            tablesCount: Object.keys(options.schema).length
        }, 'Initializing Core REST Adapter');

        this.setupRoutes();
    }

    /**
     * Get logger (for framework adapters to use)
     */
    protected getLogger(): Logger {
        return this.logger;
    }

    protected setupRoutes(): void {
        const { schema, tableOptions } = this.options;

        // Use schema introspection
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();

        this.logger.debug({
            tables: tables.map(t => ({
                name: t.name,
                primaryKey: t.primaryKey,
                columnsCount: t.columns.length
            }))
        }, 'Schema inspection completed');

        // Create metadata map for quick lookup
        tables.forEach(table => this.tablesMetadataMap.set(table.name, table));

        tables.forEach(tableMetadata => {
            const table = schema[tableMetadata.name];
            const resourcePath = `/${tableMetadata.name}`;
            const itemPath = `/${tableMetadata.name}/:id`;

            this.logger.debug({
                table: tableMetadata.name,
                resourcePath,
                primaryKey: tableMetadata.primaryKey
            }, 'Setting up routes for table');

            // Get primary key column name(s)
            const primaryKeyColumns = tableMetadata.primaryKey;
            if (primaryKeyColumns.length === 0) {
                this.logger.warn({
                    table: tableMetadata.name
                }, 'Skipping table: no primary key found');
                return;
            }

            // For now, handle single-column primary keys
            const primaryKeyColumn = primaryKeyColumns[0];
            const columns = getTableColumns(table);
            const tableConfig = tableOptions?.[tableMetadata.name];

            // Create table context (will be merged with request context in handlers)
            const tableContext: ITableActionContext = {
                db: this.options.db,
                table,
                tableMetadata,
                primaryKeyColumn,
                columns,
                schema: this.options.schema,
                tablesMetadataMap: this.tablesMetadataMap,
                tableConfig,
                logger: this.logger
            };

            // Register CRUD routes for this table
            this.registerTableRoutes(
                resourcePath,
                itemPath,
                tableContext
            );
        });

        this.logger.info({
            tablesProcessed: tables.length,
            routesRegistered: this.routes.size
        }, 'Core REST Adapter initialization completed');
    }

    /**
     * Register CRUD routes for a specific table
     */
    protected registerTableRoutes(
        resourcePath: string,
        itemPath: string,
        tableContext: ITableActionContext
    ): void {
        // Get table configuration from context
        const tableConfig = tableContext.tableConfig;

        // GET /<table-name> (GET_MANY)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.GET_MANY)) {
            this.routes.set(`GET:${resourcePath}`, {
                method: 'GET',
                path: resourcePath,
                actionHandler: (requestContext) => coreGetManyAction(tableContext, requestContext)
            });
        }

        // POST /<table-name> (CREATE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.CREATE)) {
            this.routes.set(`POST:${resourcePath}`, {
                method: 'POST',
                path: resourcePath,
                actionHandler: (requestContext) => coreCreateAction(tableContext, requestContext)
            });
        }

        // GET /<table-name>/:id (GET_ONE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.GET_ONE)) {
            this.routes.set(`GET:${itemPath}`, {
                method: 'GET',
                path: itemPath,
                actionHandler: (requestContext) => coreGetOneAction(tableContext, requestContext)
            });
        }

        // PATCH /<table-name>/:id (UPDATE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.UPDATE)) {
            this.routes.set(`PATCH:${itemPath}`, {
                method: 'PATCH',
                path: itemPath,
                actionHandler: (requestContext) => coreUpdateAction(tableContext, requestContext)
            });
        }

        // PUT /<table-name>/:id (REPLACE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.REPLACE)) {
            this.routes.set(`PUT:${itemPath}`, {
                method: 'PUT',
                path: itemPath,
                actionHandler: (requestContext) => coreReplaceAction(tableContext, requestContext)
            });
        }

        // DELETE /<table-name>/:id (DELETE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.DELETE)) {
            this.routes.set(`DELETE:${itemPath}`, {
                method: 'DELETE',
                path: itemPath,
                actionHandler: (requestContext) => coreDeleteAction(tableContext, requestContext)
            });
        }
    }

    /**
     * Handles an incoming Web API Request by matching it to a route, extracting parameters,
     * executing the corresponding handler, and returning a Web API Response.
     *
     * @param request The incoming Web API Request to process.
     * @returns A promise that resolves to a Web API Response.
     */
    async handle(request: Request): Promise<Response> {
        const requestId = request.headers.get('x-request-id') || Math.random().toString(36).substring(7);
        const startTime = Date.now();

        try {
            // Create request context by parsing the request
            const requestContext = await this.createRequestContext(request, requestId);

            // Find matching route
            const route = this.findMatchingRoute(requestContext);

            if (!route) {
                this.logger.warn({
                    requestId,
                    method: request.method,
                    url: request.url
                }, 'No matching route found');

                return new Response(JSON.stringify({
                    error: 'Route not found',
                    requestId
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Extract route parameters and update context
            const params = this.extractRouteParams(route.path, request.url);
            requestContext.params = { ...requestContext.params, ...params };

            this.logger.debug({
                requestId,
                method: request.method,
                path: route.path,
                params: requestContext.params
            }, 'Processing request');

            // Execute the action handler with the request context (table context is already bound)
            const response = await route.actionHandler(requestContext);

            this.logger.info({
                requestId,
                method: request.method,
                path: route.path,
                status: response.status,
                duration: Date.now() - startTime
            }, 'Request completed successfully');

            // Return the response
            return response;

        } catch (error: any) {
            this.logger.error({
                requestId,
                method: request.method,
                url: request.url,
                duration: Date.now() - startTime,
                error: {
                    message: error.message,
                    code: error.code,
                    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
                }
            }, 'Unexpected request error');

            return new Response(JSON.stringify({
                error: 'Internal Server Error',
                requestId
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Create request context from pure Web API Request
     */
    protected async createRequestContext(request: Request, requestId: string): Promise<IRequestContext> {
        // Parse URL for query parameters
        const url = new URL(request.url);
        const query: Record<string, any> = {};

        // Convert URLSearchParams to plain object
        url.searchParams.forEach((value, key) => {
            if (query[key]) {
                // Handle multiple values for same key
                if (Array.isArray(query[key])) {
                    query[key].push(value);
                } else {
                    query[key] = [query[key], value];
                }
            } else {
                query[key] = value;
            }
        });

        // Parse body if present
        let parsedBody: any = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const contentType = request.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                try {
                    const text = await request.text();
                    parsedBody = text ? JSON.parse(text) : null;
                } catch {
                    // Invalid JSON, leave as null
                }
            }
        }

        return {
            request,
            params: {}, // Will be populated by route matching
            query,
            requestId,
            parsedBody
        };
    }

    protected findMatchingRoute(context: IRequestContext): IRouteHandler | null {
        const request = context.request;
        const routeKey = `${request.method}:${this.normalizeUrlPath(request.url)}`;

        // Try exact match first
        const exactMatch = this.routes.get(routeKey);
        if (exactMatch) {
            return exactMatch;
        }

        // Try pattern matching for routes with parameters
        for (const [key, route] of this.routes) {
            if (key.startsWith(`${request.method}:`)) {
                const pattern = key.substring(request.method.length + 1);
                if (this.matchesPattern(pattern, this.normalizeUrlPath(request.url))) {
                    return route;
                }
            }
        }

        return null;
    }

    protected normalizeUrlPath(url: string): string {
        try {
            const urlObj = new URL(url, 'http://localhost');
            return urlObj.pathname;
        } catch {
            // If URL parsing fails, assume it's already a path
            return url.split('?')[0];
        }
    }

    protected matchesPattern(pattern: string, path: string): boolean {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return false;
        }

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                // This is a parameter, it matches any value
                continue;
            }

            if (patternPart !== pathPart) {
                return false;
            }
        }

        return true;
    }

    protected extractRouteParams(pattern: string, url: string): Record<string, string> {
        const params: Record<string, string> = {};
        const path = this.normalizeUrlPath(url);

        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];

            if (patternPart.startsWith(':')) {
                const paramName = patternPart.substring(1);
                params[paramName] = pathParts[i];
            }
        }

        return params;
    }
}

