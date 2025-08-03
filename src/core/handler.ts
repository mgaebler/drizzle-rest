import { PgTable } from 'drizzle-orm/pg-core';

import { IFrameworkAdapter } from '../adapters/framework-adapter';
import { Logger } from '../utils/logger';
import { DrizzleDb } from './types/handler.types';
import { OperationTypeEnum } from './types/operation.types';
import { TableMetadata } from './utils/schema-inspector';

/**
 * Framework-agnostic action context
 */
interface CoreActionContext {
    db: DrizzleDb;
    table: PgTable;
    tableMetadata: TableMetadata;
    primaryKeyColumn: string;
    columns: Record<string, any>;
    schema: Record<string, PgTable | any>;
    tablesMetadataMap: Map<string, any>;
    tableConfig?: {
        disabledEndpoints?: Array<OperationTypeEnum>;
        hooks?: {
            beforeOperation?: (context: any) => Promise<void>;
            afterOperation?: (context: any, result: any) => Promise<any>;
        };
    };
    logger: Logger;
    adapter: IFrameworkAdapter;
}
