import { createCoreHookContext } from '../hook-context';
import type { IAdapterRequest, IAdapterResponse } from '../types/adapter.types';
import { ICoreActionContext } from '../types/handler.types';
import { CoreErrorHandler } from '../utils/error-handler';
import { createAdapterResponse } from '../utils/response-helper';
import { ActionOptions, ActionTypeEnum } from './action.types';

/**
 * Base class providing common action patterns
 */
export abstract class BaseAction {
    /** Parsed request parameters (e.g., route params like :id) */
    protected params: Record<string, any> = {};
    /** Parsed query parameters from URL search params */
    protected query: Record<string, any> = {};
    /** Parsed request body */
    protected body: any = null;

    protected abstract executeCore(
        context: ICoreActionContext
    ): Promise<any>;

    public async execute(
        request: IAdapterRequest,
        context: ICoreActionContext,
        options: ActionOptions
    ): Promise<IAdapterResponse> {
        const { tableMetadata, logger } = context;
        const { actionType, includeId = false, statusCode = 200 } = options;

        // Parse request data and make available to subclasses
        this.params = request.params || {};
        this.query = request.query || {};
        this.body = request.body || null;

        const requestId = request.requestId || 'unknown';
        const startTime = Date.now();
        const id = includeId ? this.params.id : undefined;

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
            const result = await this.executeCore(context);

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
        const { tableMetadata, tableConfig, logger } = context;

        if (!tableConfig?.hooks?.beforeOperation) return null;

        const hookContext = createCoreHookContext(
            request,
            actionType,
            tableMetadata.name
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

            return CoreErrorHandler.handleError(hookError, 'beforeOperation', logger, requestId);
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
        const { tableMetadata, tableConfig, logger } = context;

        if (!tableConfig?.hooks?.afterOperation) {
            return { result };
        }

        const hookContext = createCoreHookContext(
            request,
            actionType,
            tableMetadata.name
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
                error: CoreErrorHandler.handleError(hookError, 'afterOperation', logger, requestId)
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
        if (this.body) logData.bodyKeys = Object.keys(this.body);
        if (this.query && Object.keys(this.query).length > 0) logData.query = this.query;

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

        return CoreErrorHandler.handleError(error, action.toLowerCase(), logger, requestId);
    }

    protected handleNotFound(requestId: string, tableName: string, action: ActionTypeEnum, startTime: number, id: string, logger: any): IAdapterResponse {
        const duration = Date.now() - startTime;
        logger.info({
            requestId,
            table: tableName,
            id,
            duration
        }, `${action} request: record not found`);

        return CoreErrorHandler.handleNotFound('Record not found', logger, requestId);
    }
}

