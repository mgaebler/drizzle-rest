import { getTableColumns } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { ITableActionContext } from './actions';
import {
    coreCreateAction,
    coreDeleteAction,
    coreGetManyAction,
    coreGetOneAction,
    coreReplaceAction,
    coreUpdateAction
} from './actions';
import { ActionTypeEnum } from './actions';
import type { Logger } from './logger';
import { createLogger } from './logger';
import type { IRequestContext } from './types/adapter.types';
import type { DrizzleDb, IRouteHandler } from './types/handler.types';
import { parseQueryParamsFromUrl } from './utils/request-helpers';
import { SchemaInspector } from './utils/schema-inspector/schema-inspector';

// Re-export for convenience
export type { IFrameworkAdapter } from './types/adapter.types';

interface ITableHooks {
    beforeOperation?: (context: any) => Promise<void>;
    afterOperation?: (context: any, result: any) => Promise<any>;
}

interface IRestHandler {
    handle(request: Request): Promise<Response>;
}

export interface ICoreAdapterOptions {
    /** The Drizzle database instance. */
    db: DrizzleDb;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /**
     * Optional global base path prefix (e.g. "/api/v1").
     * If omitted, empty, or "/" it is ignored.
     * Will be normalized to start with a single leading slash and have no trailing slash.
     */
    basePath?: string;

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

export abstract class CoreAdapter implements IRestHandler {
    private routes: Map<string, IRouteHandler> = new Map();
    private options: ICoreAdapterOptions;
    private logger: Logger;
    private tablesMetadataMap: Map<string, any> = new Map();
    private basePath: string; // normalized base path ('' means none)

    constructor(options: ICoreAdapterOptions) {
        this.options = options;
        this.logger = options.logger || createLogger();
        this.basePath = this.normalizeBasePath(options.basePath);

        this.logger.info({
            tablesCount: Object.keys(options.schema).length,
            basePath: this.basePath || '(none)'
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
            const resourcePath = `${this.basePath}/${tableMetadata.name}`.replace(/\/+/g, '/');
            const itemPath = `${resourcePath}/:id`;

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
                tableConfig
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
                actionHandler: (requestContext) => coreGetManyAction(tableContext, requestContext, this.logger)
            });
        }

        // POST /<table-name> (CREATE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.CREATE)) {
            this.routes.set(`POST:${resourcePath}`, {
                method: 'POST',
                path: resourcePath,
                actionHandler: (requestContext) => coreCreateAction(tableContext, requestContext, this.logger)
            });
        }

        // GET /<table-name>/:id (GET_ONE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.GET_ONE)) {
            this.routes.set(`GET:${itemPath}`, {
                method: 'GET',
                path: itemPath,
                actionHandler: (requestContext) => coreGetOneAction(tableContext, requestContext, this.logger)
            });
        }

        // PATCH /<table-name>/:id (UPDATE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.UPDATE)) {
            this.routes.set(`PATCH:${itemPath}`, {
                method: 'PATCH',
                path: itemPath,
                actionHandler: (requestContext) => coreUpdateAction(tableContext, requestContext, this.logger)
            });
        }

        // PUT /<table-name>/:id (REPLACE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.REPLACE)) {
            this.routes.set(`PUT:${itemPath}`, {
                method: 'PUT',
                path: itemPath,
                actionHandler: (requestContext) => coreReplaceAction(tableContext, requestContext, this.logger)
            });
        }

        // DELETE /<table-name>/:id (DELETE)
        if (!tableConfig?.disabledEndpoints?.includes(ActionTypeEnum.DELETE)) {
            this.routes.set(`DELETE:${itemPath}`, {
                method: 'DELETE',
                path: itemPath,
                actionHandler: (requestContext) => coreDeleteAction(tableContext, requestContext, this.logger)
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
        const startTime = Date.now();

        // Create request context by parsing the request
        const requestContext = await this.createRequestContext(request);

        try {
            // Find matching route
            const route = this.findMatchingRoute(requestContext);

            if (!route) {
                this.logger.warn({
                    requestId: requestContext.requestId,
                    method: requestContext.method,
                    url: requestContext.url
                }, 'No matching route found');

                return new Response(JSON.stringify({
                    error: 'Route not found',
                    requestId: requestContext.requestId
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Extract route parameters from the URL pattern match
            requestContext.params = this.extractRouteParams(route.path, requestContext.pathname);

            this.logger.debug({
                requestId: requestContext.requestId,
                method: requestContext.method,
                path: route.path,
                params: requestContext.params
            }, 'Processing request');

            // Execute the action handler with the request context (table context is already bound)
            const response = await route.actionHandler(requestContext);

            this.logger.info({
                requestId: requestContext.requestId,
                method: requestContext.method,
                path: route.path,
                status: response.status,
                duration: Date.now() - startTime
            }, 'Request completed successfully');

            // Return the response
            return response;

        } catch (error: any) {
            this.logger.error({
                requestId: requestContext.requestId,
                method: requestContext.method,
                url: requestContext.url,
                duration: Date.now() - startTime,
                error: {
                    message: error.message,
                    code: error.code,
                    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
                }
            }, 'Unexpected request error');

            return new Response(JSON.stringify({
                error: 'Internal Server Error',
                requestId: requestContext.requestId
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    /**
     * Create request context from pure Web API Request
     * From now on the request context will be used instead of the request object directly
     */
    protected async createRequestContext(request: Request): Promise<IRequestContext> {
        // Generate request ID from header or create a new one
        const requestId = request.headers.get('x-request-id') || Math.random().toString(36).substring(7);

        // Parse URL and query parameters using utility function
        const url = new URL(request.url);
        const query = parseQueryParamsFromUrl(request.url);

        // Normalize pathname: remove trailing slash (except root)
        let pathname = url.pathname;
        if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }

        // Parse body if present
        const parsedBody = await this.parseRequestBody(request);

        return {
            method: request.method,
            url: request.url,
            pathname,
            headers: request.headers,
            params: {}, // Will be populated during route matching
            query,
            requestId,
            parsedBody
        };
    }

    /**
     * Parse request body for non-GET/HEAD requests
     */
    protected async parseRequestBody(request: Request): Promise<any> {
        if (request.method === 'GET' || request.method === 'HEAD') {
            return null;
        }

        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            try {
                const text = await request.text();
                return text ? JSON.parse(text) : null;
            } catch (error: any) {
                this.logger.warn({ error: error.message }, 'Invalid JSON in request body');
                return null;
            }
        }

        return null;
    }

    protected findMatchingRoute(context: IRequestContext): IRouteHandler | null {
        const routeKey = `${context.method}:${context.pathname}`;

        // Try exact match first
        const exactMatch = this.routes.get(routeKey);
        if (exactMatch) {
            return exactMatch;
        }

        // Try pattern matching for routes with parameters
        for (const [key, route] of this.routes) {
            if (key.startsWith(`${context.method}:`)) {
                const pattern = key.substring(context.method.length + 1);
                if (this.matchesPattern(pattern, context.pathname)) {
                    return route;
                }
            }
        }

        return null;
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

    protected extractRouteParams(pattern: string, pathname: string): Record<string, string> {
        const params: Record<string, string> = {};

        const patternParts = pattern.split('/');
        const pathParts = pathname.split('/');

        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];

            if (patternPart.startsWith(':')) {
                const paramName = patternPart.substring(1);
                params[paramName] = pathParts[i];
            }
        }

        return params;
    }

    /** Normalize a base path value into a canonical form */
    private normalizeBasePath(input?: string): string {
        if (!input) return '';
        let p = input.trim();
        if (p === '' || p === '/') return '';
        if (!p.startsWith('/')) p = '/' + p;
        if (p.endsWith('/')) p = p.slice(0, -1);
        return p === '/' ? '' : p;
    }
}

