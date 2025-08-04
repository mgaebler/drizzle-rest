import type { IAdapterRequest } from '../types/adapter.types';
import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { ActionOptions } from './action.types';
import { BaseAction } from './base-action';

/**
 * Utility function for creating simple action handlers
 */

export function createActionHandler(
    executeCore: (request: IAdapterRequest, context: ICoreActionContext) => Promise<any>,
    options: ActionOptions
): ICoreActionHandler {
    const action = new (class extends BaseAction {
        protected async executeCore(request: IAdapterRequest, context: ICoreActionContext): Promise<any> {
            return executeCore(request, context);
        }
    })();

    return (request: IAdapterRequest, context: ICoreActionContext) => action.execute(request, context, options);
}
