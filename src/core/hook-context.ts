import { ActionTypeEnum } from './actions/action.types';
import { IAdapterRequest } from './types/adapter.types';

interface CoreHookContext {
    request: IAdapterRequest;           // Framework-agnostic request
    action: ActionTypeEnum;
    table: string;          // Table name
    record?: any;           // For CREATE/UPDATE actions
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
        record?: any;
    } = {}
): CoreHookContext => {
    return {
        request,
        action,
        table: tableMetadata.name,
        record: options.record,
    };
};
