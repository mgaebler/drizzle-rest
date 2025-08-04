import { OperationTypeEnum } from './actions/operation.types';
import { IAdapterRequest } from './types/adapter.types';

interface CoreHookContext {
    request: IAdapterRequest;           // Framework-agnostic request
    operation: OperationTypeEnum;
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
 * Helper function to create CoreHookContext objects for framework-agnostic operations
 */
export const createCoreHookContext = (
    request: IAdapterRequest,
    operation: OperationTypeEnum,
    tableMetadata: any,
    primaryKeyColumn: string,
    columns: any,
    options: {
        filters?: any;
        record?: any;
        recordId?: string;
    } = {}
): CoreHookContext => {
    return {
        request,
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
