import { ActionTypeEnum } from './actions/action.types';
import { IAdapterRequest } from './types/adapter.types';

interface CoreHookContext {
    request: IAdapterRequest;           // Framework-agnostic request
    action: ActionTypeEnum;
    tableName: string;          // Table name
    record?: any;           // For CREATE/UPDATE actions
}

/**
 * Helper function to create CoreHookContext objects for framework-agnostic actions
 */
export const createCoreHookContext = (
    request: IAdapterRequest,
    action: ActionTypeEnum,
    tableName: string,
    record?: any
): CoreHookContext => {
    return {
        request,
        action,
        tableName,
        record,
    };
};
