import { ActionTypeEnum } from './actions/action.types';
import { IAdapterRequest } from './types/adapter.types';

interface CoreHookContext {
    request: IAdapterRequest;           // Framework-agnostic request
    action: ActionTypeEnum;
    table: string;          // Table name
    record?: any;           // For CREATE/UPDATE actions
    recordId?: string;      // For GET_ONE/UPDATE/DELETE actions
    filters?: any;          // For GET_MANY actions
    metadata: {
        tableName: string;
        primaryKey: string;
        columns: string[];
    };
}

/**
 * Helper function to create CoreHookContext objects for framework-agnostic actions
 */
export const createCoreHookContext = (
    request: IAdapterRequest,
    action: ActionTypeEnum,
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
        action,
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
