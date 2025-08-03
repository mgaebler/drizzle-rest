import { PgTable } from 'drizzle-orm/pg-core';

import { IFrameworkAdapter } from '../adapters/framework-adapter';
import { Logger } from '../utils/logger';
import { IAdapterRequest, IAdapterResponse } from './adapter-api';
import { DrizzleDb } from './handler.types';
import { OperationType } from './utils/hook-context';
import { TableMetadata } from './utils/schema-inspector';

/**
 * Framework-agnostic action context
 */
export interface CoreActionContext {
    db: DrizzleDb;
    table: PgTable;
    tableMetadata: TableMetadata;
    primaryKeyColumn: string;
    columns: Record<string, any>;
    schema: Record<string, PgTable | any>;
    tablesMetadataMap: Map<string, any>;
    tableConfig?: {
        disabledEndpoints?: Array<OperationType>;
        hooks?: {
            beforeOperation?: (context: any) => Promise<void>;
            afterOperation?: (context: any, result: any) => Promise<any>;
        };
    };
    logger: Logger;
    adapter: IFrameworkAdapter;
}

/**
 * Framework-agnostic action handler interface
 */
export interface CoreActionHandler {
    (
        request: IAdapterRequest,
        context: CoreActionContext
    ): Promise<IAdapterResponse>;
}

/**
 * Main framework-agnostic handler interface
 */
export interface DrizzleRestHandler {
    handle(request: IAdapterRequest): Promise<IAdapterResponse>;
}

/**
 * Route handler for a specific HTTP method and path
 */
export interface RouteHandler {
    method: string;
    path: string;
    handler: (request: IAdapterRequest) => Promise<IAdapterResponse>;
}
