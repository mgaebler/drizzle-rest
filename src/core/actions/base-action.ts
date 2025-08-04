import { createAdapterResponse } from '../adapter-api';
import { createCoreHookContext } from '../hook-context';
import type { IAdapterRequest, IAdapterResponse } from '../types/adapter.types';
import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { CoreErrorHandler } from '../utils/error-handler';
import { ActionTypeEnum } from './action.types';

export interface ActionOptions {
    actionType: ActionTypeEnum;
    includeId?: boolean;
    statusCode?: number;
}

/**
 * Base class providing common action patterns
 */
export abstract class BaseAction {
    protected abstract executeCore(
        request: IAdapterRequest,
        context: ICoreActionContext
    ): Promise<any>;

    public async execute(
        request: IAdapterRequest,
        context: ICoreActionContext,
        options: ActionOptions
    ): Promise<IAdapterResponse> {
        const { tableMetadata, logger } = context;
        const { actionType, includeId = false, statusCode = 200 } = options;

        const requestId = request.requestId || 'unknown';
        const startTime = Date.now();
        const id = includeId ? request.params.id : undefined;

        try {
            // Initial logging
            this.logStart(logger, requestId, tableMetadata.name, actionType, request, id);

            // Execute beforeAction hook
            const beforeHookResult = await this.executeBeforeHook(
                request,
                context,
                actionType,
                requestId,
                startTime
            );

            // If beforeHook returned an error response, return it immediately
            if (beforeHookResult) {
                return beforeHookResult;
            }

            // Execute core action
            const result = await this.executeCore(request, context);

            // Execute afterAction hook
            const afterHookResult = await this.executeAfterHook(
                request,
                context,
                actionType,
                result,
                requestId,
                startTime
            );

            // If afterHook returned an error response, return it immediately
            if (afterHookResult.error) {
                return afterHookResult.error;
            }

            // Success logging
            this.logSuccess(logger, requestId, tableMetadata.name, actionType, startTime, id);

            return createAdapterResponse(afterHookResult.result, statusCode);

        } catch (error: any) {
            return this.handleError(error, requestId, tableMetadata.name, actionType, startTime, id, logger);
        }
    }

    private async executeBeforeHook(
        request: IAdapterRequest,
        context: ICoreActionContext,
        actionType: ActionTypeEnum,
        requestId: string,
        startTime: number
    ): Promise<IAdapterResponse | null> {
        const { tableMetadata, primaryKeyColumn, columns, tableConfig, logger } = context;

        if (!tableConfig?.hooks?.beforeOperation) return null;

        const hookContext = createCoreHookContext(
            request,
            actionType,
            tableMetadata,
            primaryKeyColumn,
            columns
        );

        try {
            await tableConfig.hooks.beforeOperation(hookContext);
            return null; // Success, continue with action
        } catch (hookError) {
            logger.error({
                requestId,
                table: tableMetadata.name,
                duration: Date.now() - startTime,
                error: hookError
            }, `${actionType} request failed in beforeOperation hook`);

            return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
        }
    }

    private async executeAfterHook(
        request: IAdapterRequest,
        context: ICoreActionContext,
        actionType: ActionTypeEnum,
        result: any,
        requestId: string,
        startTime: number
    ): Promise<{ result: any; error?: IAdapterResponse }> {
        const { tableMetadata, primaryKeyColumn, columns, tableConfig, logger } = context;

        if (!tableConfig?.hooks?.afterOperation) {
            return { result };
        }

        const hookContext = createCoreHookContext(
            request,
            actionType,
            tableMetadata,
            primaryKeyColumn,
            columns
        );

        try {
            if (Array.isArray(result)) {
                // Handle array results (like GET_MANY)
                const processedResult = await Promise.all(
                    result.map((item: any) => tableConfig.hooks!.afterOperation!(hookContext, item))
                );
                return { result: processedResult };
            } else {
                // Handle single results
                const processedResult = await tableConfig.hooks.afterOperation(hookContext, result);
                return { result: processedResult };
            }
        } catch (hookError) {
            logger.error({
                requestId,
                table: tableMetadata.name,
                duration: Date.now() - startTime,
                error: hookError
            }, `${actionType} request failed in afterOperation hook`);

            return {
                result: null,
                error: CoreErrorHandler.handleError(hookError, 'afterOperation', requestId)
            };
        }
    }

    protected logStart(
        logger: any,
        requestId: string,
        tableName: string,
        action: ActionTypeEnum,
        request: IAdapterRequest,
        id?: string
    ): void {
        const logData: any = {
            requestId,
            table: tableName
        };

        if (id) logData.id = id;
        if (request.body) logData.bodyKeys = Object.keys(request.body);
        if (request.query && Object.keys(request.query).length > 0) logData.query = request.query;

        logger.debug(logData, `Processing ${action} request`);
    }

    protected logSuccess(
        logger: any,
        requestId: string,
        tableName: string,
        action: ActionTypeEnum,
        startTime: number,
        id?: string
    ): void {
        const duration = Date.now() - startTime;
        const logData: any = {
            requestId,
            table: tableName,
            duration
        };

        if (id) logData.id = id;

        logger.info(logData, `${action} request completed successfully`);
    }

    private handleError(
        error: any,
        requestId: string,
        tableName: string,
        action: ActionTypeEnum,
        startTime: number,
        id: string | undefined,
        logger: any
    ): IAdapterResponse {
        const duration = Date.now() - startTime;
        const logData: any = {
            requestId,
            table: tableName,
            duration,
            error: error.message
        };

        if (id) logData.id = id;

        logger.error(logData, `${action} request failed`);

        return CoreErrorHandler.handleError(error, action.toLowerCase(), requestId);
    }

    protected handleNotFound(requestId: string, tableName: string, action: ActionTypeEnum, startTime: number, id: string, logger: any): IAdapterResponse {
        const duration = Date.now() - startTime;
        logger.info({
            requestId,
            table: tableName,
            id,
            duration
        }, `${action} request: record not found`);

        return CoreErrorHandler.handleNotFound('Record not found', requestId);
    }
}

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

    return (request: IAdapterRequest, context: ICoreActionContext) =>
        action.execute(request, context, options);
}
