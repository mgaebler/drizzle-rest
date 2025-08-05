import { PgTable } from 'drizzle-orm/pg-core';

import { Logger } from '../logger';
import { DrizzleDb } from '../types/handler.types';
import { TableMetadata } from '../utils/schema-inspector';

export enum ActionTypeEnum {
    GET_MANY = 'GET_MANY',
    GET_ONE = 'GET_ONE',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    REPLACE = 'REPLACE',
    DELETE = 'DELETE'
}

export interface ActionOptions {
    actionType: ActionTypeEnum;
    includeId?: boolean;
    statusCode?: number;
}/**
 * Table action context containing database and table configuration data
 * Used internally by the adapter before merging with request data
 */
export interface ITableActionContext {
    // Database and table configuration
    db: DrizzleDb;
    table: PgTable;
    tableMetadata: TableMetadata;
    primaryKeyColumn: string;
    columns: Record<string, any>;
    schema: Record<string, PgTable | any>;
    tablesMetadataMap: Map<string, any>;
    tableConfig?: {
        disabledEndpoints?: Array<ActionTypeEnum>;
        hooks?: {
            beforeOperation?: (context: any) => Promise<void>;
            afterOperation?: (context: any, result: any) => Promise<any>;
        };
    };
    logger: Logger;
}

/**
 * Unified action context containing all data needed to handle actions
 * Combines request data with database/table configuration
 */
export interface ICoreActionContext extends ITableActionContext {
    // Request data
    request: Request;
    params: Record<string, string>;
    query: Record<string, any>;
    requestId: string;
    parsedBody: any;
}

