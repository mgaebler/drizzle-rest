import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';

import { FrameworkAdapter } from '../adapters/framework-adapter';
import { Logger } from '../utils/logger';
import { AdapterRequest, AdapterResponse } from './adapter-api';
import { OperationType } from './utils/hook-context';
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
    adapter: FrameworkAdapter;
}

/**
 * Framework-agnostic action handler interface
 */
export interface ICoreActionHandler {
    (
        request: AdapterRequest,
        context: ICoreActionContext
    ): Promise<AdapterResponse>;
}

/**
 * Main framework-agnostic handler interface
 */
export interface IDrizzleRestHandler {
    handle(request: AdapterRequest): Promise<AdapterResponse>;
}

/**
 * Route handler for a specific HTTP method and path
 */
export interface IRouteHandler {
    method: string;
    path: string;
    handler: (request: AdapterRequest) => Promise<AdapterResponse>;
}
