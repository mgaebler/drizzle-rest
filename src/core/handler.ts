import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';

import { FrameworkAdapter } from '../adapters/framework-adapter';
import { OperationType } from '../utils/hook-context';
import { Logger } from '../utils/logger';
import { TableMetadata } from '../utils/schema-inspector';
import { DrizzleRequest, DrizzleResponse } from './web-api-types';

/**
 * Framework-agnostic database type
 */
export type DrizzleDb = PgliteDatabase<any>;

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
    adapter: FrameworkAdapter;
}

/**
 * Framework-agnostic action handler interface
 */
export interface CoreActionHandler {
    (
        request: DrizzleRequest,
        context: CoreActionContext
    ): Promise<DrizzleResponse>;
}

/**
 * Main framework-agnostic handler interface
 */
export interface DrizzleRestHandler {
    handle(request: DrizzleRequest): Promise<DrizzleResponse>;
}

/**
 * Route handler for a specific HTTP method and path
 */
export interface RouteHandler {
    method: string;
    path: string;
    handler: (request: DrizzleRequest) => Promise<DrizzleResponse>;
}
