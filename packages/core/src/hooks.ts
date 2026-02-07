import type { ActionTypeEnum } from './actions/action.types';

interface CoreHookContext {
    action: ActionTypeEnum;
    tableName: string; // Table name
    record?: any; // For CREATE/UPDATE actions
}

/**
 * Helper function to create CoreHookContext objects for framework-agnostic actions
 */
export const createCoreHookContext = (action: ActionTypeEnum, tableName: string, record?: any): CoreHookContext => {
    return {
        action,
        tableName,
        record,
    };
};
