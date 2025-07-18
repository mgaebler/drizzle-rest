import { Request, Response } from 'express';

export enum OperationType {
    GET_MANY = 'GET_MANY',
    GET_ONE = 'GET_ONE',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    REPLACE = 'REPLACE',
    DELETE = 'DELETE'
}

export interface HookContext {
    req: Request & { user?: any };           // Access to req.user from framework auth
    res: Response;          // Access to response object
    operation: OperationType;
    table: string;          // Table name
    record?: any;           // For CREATE/UPDATE operations
    recordId?: string;      // For GET_ONE/UPDATE/DELETE operations
    filters?: any;          // For GET_MANY operations
    metadata: {
        tableName: string;
        primaryKey: string;
        columns: string[];
    };
}

/**
 * Helper function to create HookContext objects
 * Eliminates code duplication across route handlers
 */
export const createHookContext = (
    req: Request,
    res: Response,
    operation: OperationType,
    tableMetadata: any,
    primaryKeyColumn: string,
    columns: any,
    options: {
        filters?: any;
        record?: any;
        recordId?: string;
    } = {}
): HookContext => {
    return {
        req,
        res,
        operation,
        table: tableMetadata.name,
        filters: options.filters,
        record: options.record,
        recordId: options.recordId,
        metadata: {
            tableName: tableMetadata.name,
            primaryKey: primaryKeyColumn,
            columns: Object.keys(columns)
        }
    };
};
