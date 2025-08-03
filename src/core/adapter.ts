import { getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

import { createLogger, Logger } from '../utils/logger';
import {
    coreCreateAction,
    coreDeleteAction,
    coreGetManyAction,
    coreGetOneAction,
    coreReplaceAction,
    coreUpdateAction
} from './actions';
import { IAdapterRequest, IAdapterResponse } from './types/adapter.types';
import { IFrameworkAdapter } from './types/adapter.types';
import { DrizzleDb, IAdapterRestHandler as IRestHandler, ICoreActionContext, IRouteHandler } from './types/handler.types';
import { OperationTypeEnum } from './types/operation.types';
import { CoreErrorHandler } from './utils/error-handler';
import { SchemaInspector } from './utils/schema-inspector';

interface TableHooks {
    beforeOperation?: (context: any) => Promise<void>;
    afterOperation?: (context: any, result: any) => Promise<any>;
}

export interface ICoreRestAdapterOptions {
    /** The Drizzle database instance. */
    db: DrizzleDb;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /** Detailed configuration per table. */
    tableOptions?: {
        [tableName: string]: {
            disabledEndpoints?: Array<OperationTypeEnum>;
            hooks?: TableHooks;
        }
    };

    /** Logger instance to use (create with createLogger() if needed) */
    logger?: Logger;

    /** Framework adapter for handling requests/responses */
    adapter: IFrameworkAdapter;
}

/**
 * Core framework-agnostic REST adapter
 */
export class CoreRestAdapter implements IRestHandler {
    private routes: Map<string, IRouteHandler> = new Map();
    private options: ICoreRestAdapterOptions;
    private logger: Logger;
    private tablesMetadataMap: Map<string, any> = new Map();

    constructor(options: ICoreRestAdapterOptions) {
        this.options = options;
        this.logger = options.logger || createLogger();

        // Set up logging
        CoreErrorHandler.setLogger(this.logger);

        this.logger.info({
            tablesCount: Object.keys(options.schema).length,
            framework: options.adapter.name
        }, 'Initializing Core REST Adapter');

        this.setupRoutes();
    }

    private setupRoutes(): void {
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

            // Create action context
            const createActionContext = (): ICoreActionContext => ({
                db: this.options.db,
                table,
                tableMetadata,
                primaryKeyColumn,
                columns,
                schema: this.options.schema,
                tablesMetadataMap: this.tablesMetadataMap,
                tableConfig,
                logger: this.logger,
                adapter: this.options.adapter
            });

            // GET /<table-name> (GET_MANY)
            if (!tableConfig?.disabledEndpoints?.includes(OperationTypeEnum.GET_MANY)) {
                this.routes.set(`GET:${resourcePath}`, {
                    method: 'GET',
                    path: resourcePath,
                    handler: async (request) => {
                        const context = createActionContext();
                        return coreGetManyAction(request, context);
                    }
                });
            }

            // POST /<table-name> (CREATE)
            if (!tableConfig?.disabledEndpoints?.includes(OperationTypeEnum.CREATE)) {
                this.routes.set(`POST:${resourcePath}`, {
                    method: 'POST',
                    path: resourcePath,
                    handler: async (request) => {
                        const context = createActionContext();
                        return coreCreateAction(request, context);
                    }
                });
            }

            // GET /<table-name>/:id (GET_ONE)
            if (!tableConfig?.disabledEndpoints?.includes(OperationTypeEnum.GET_ONE)) {
                this.routes.set(`GET:${itemPath}`, {
                    method: 'GET',
                    path: itemPath,
                    handler: async (request) => {
                        const context = createActionContext();
                        return coreGetOneAction(request, context);
                    }
                });
            }

            // PATCH /<table-name>/:id (UPDATE)
            if (!tableConfig?.disabledEndpoints?.includes(OperationTypeEnum.UPDATE)) {
                this.routes.set(`PATCH:${itemPath}`, {
                    method: 'PATCH',
                    path: itemPath,
                    handler: async (request) => {
                        const context = createActionContext();
                        return coreUpdateAction(request, context);
                    }
                });
            }

            // PUT /<table-name>/:id (REPLACE)
            if (!tableConfig?.disabledEndpoints?.includes(OperationTypeEnum.REPLACE)) {
                this.routes.set(`PUT:${itemPath}`, {
                    method: 'PUT',
                    path: itemPath,
                    handler: async (request) => {
                        const context = createActionContext();
                        return coreReplaceAction(request, context);
                    }
                });
            }

            // DELETE /<table-name>/:id (DELETE)
            if (!tableConfig?.disabledEndpoints?.includes(OperationTypeEnum.DELETE)) {
                this.routes.set(`DELETE:${itemPath}`, {
                    method: 'DELETE',
                    path: itemPath,
                    handler: async (request) => {
                        const context = createActionContext();
                        return coreDeleteAction(request, context);
                    }
                });
            }
        });

        this.logger.info({
            tablesProcessed: tables.length,
            routesRegistered: this.routes.size
        }, 'Core Drizzle REST Adapter initialization completed');
    }

    async handle(request: IAdapterRequest): Promise<IAdapterResponse> {
        const requestId = request.requestId || Math.random().toString(36).substring(7);
        const startTime = Date.now();

        try {
            // Find matching route
            const route = this.findMatchingRoute(request);

            if (!route) {
                this.logger.warn({
                    requestId,
                    method: request.method,
                    url: request.url
                }, 'No matching route found');

                return CoreErrorHandler.handleNotFound('Route not found', requestId);
            }

            // Extract route parameters
            const params = this.extractRouteParams(route.path, request.url);
            request.params = { ...request.params, ...params };

            this.logger.debug({
                requestId,
                method: request.method,
                path: route.path,
                params: request.params
            }, 'Processing request');

            // Execute the handler
            const response = await route.handler(request);

            this.logger.info({
                requestId,
                method: request.method,
                path: route.path,
                status: response.status,
                duration: Date.now() - startTime
            }, 'Request completed successfully');

            return response;

        } catch (error: any) {
            this.logger.error({
                requestId,
                method: request.method,
                url: request.url,
                duration: Date.now() - startTime,
                error: error.message
            }, 'Request failed');

            return CoreErrorHandler.handleError(error, 'request', requestId);
        }
    }

    private findMatchingRoute(request: IAdapterRequest): IRouteHandler | null {
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

    private normalizeUrlPath(url: string): string {
        try {
            const urlObj = new URL(url, 'http://localhost');
            return urlObj.pathname;
        } catch {
            // If URL parsing fails, assume it's already a path
            return url.split('?')[0];
        }
    }

    private matchesPattern(pattern: string, path: string): boolean {
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

    private extractRouteParams(pattern: string, url: string): Record<string, string> {
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
