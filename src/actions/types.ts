import { PgTable } from 'drizzle-orm/pg-core';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { Request, Response } from 'express';

import { Logger } from '../utils/logger';
import { TableMetadata } from '../utils/schema-inspector';

export type DrizzleDb = PgliteDatabase<any>;

export interface ActionContext {
    db: DrizzleDb;
    table: PgTable;
    tableMetadata: TableMetadata;
    primaryKeyColumn: string;
    columns: Record<string, any>;
    schema: Record<string, PgTable | any>;
    tablesMetadataMap: Map<string, any>;
    tableConfig?: {
        disabledEndpoints?: Array<string>;
        hooks?: {
            beforeOperation?: (context: any) => Promise<void>;
            afterOperation?: (context: any, result: any) => Promise<any>;
        };
    };
    logger: Logger;
}

export interface ActionHandler {
    (
        req: Request,
        res: Response,
        context: ActionContext
    ): Promise<void>;
}
