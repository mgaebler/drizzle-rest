import { PgTable } from 'drizzle-orm/pg-core';

import { IRequestContext } from '../types/adapter.types';
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

/**
 * Table action context containing database and table configuration data
 * Used internally by the adapter before merging with request data
 */
export interface ICoreTableContext {
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
            beforeOperation?: (tableContext: ICoreTableContext, requestContext: IRequestContext) => Promise<void>;
            afterOperation?: (tableContext: ICoreTableContext, requestContext: IRequestContext, result: any) => Promise<any>;
        };
    };
}