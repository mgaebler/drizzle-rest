import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';

import { IFrameworkAdapter } from '../adapters/framework-adapter';
import { Logger } from '../utils/logger';
import { IAdapterRequest, IAdapterResponse } from './adapter-api';
import { OperationType } from './types/operation.types';
import { TableMetadata } from './utils/schema-inspector';

/**
 * Framework-agnostic database type
 */
export type DrizzleDb = PgliteDatabase<any>;

/**
 * Framework-agnostic action context
 */
export interface ICoreActionContext {
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
export interface ICoreActionHandler {
    (
        request: IAdapterRequest,
        context: ICoreActionContext
    ): Promise<IAdapterResponse>;
}

/**
 * Main framework-agnostic handler interface
 */
export interface IDrizzleRestHandler {
    handle(request: IAdapterRequest): Promise<IAdapterResponse>;
}

/**
 * Route handler for a specific HTTP method and path
 */
export interface IRouteHandler {
    method: string;
    path: string;
    handler: (request: IAdapterRequest) => Promise<IAdapterResponse>;
}
