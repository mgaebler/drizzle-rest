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
        disabledEndpoints?: Array<ActionTypeEnum>;
        hooks?: {
            beforeOperation?: (context: any) => Promise<void>;
            afterOperation?: (context: any, result: any) => Promise<any>;
        };
    };
    logger: Logger;
}

