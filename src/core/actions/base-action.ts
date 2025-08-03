import { createAdapterResponse } from '../adapter-api';
import { createCoreHookContext } from '../hook-context';
import type { IAdapterRequest, IAdapterResponse } from '../types/adapter.types';
import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { OperationTypeEnum } from '../types/operation.types';
import { CoreErrorHandler } from '../utils/error-handler';

export interface ActionOptions {
    operationType: OperationTypeEnum;
    includeId?: boolean;
    statusCode?: number;
}

interface HookData {
    record?: any;
    recordId?: string;
    filters?: any;
}

/**
 * Base class providing common action patterns
 */
export abstract class BaseAction {
    protected abstract executeCore(
        request: IAdapterRequest,
        context: ICoreActionContext
    ): Promise<any>;

    protected createHookData(_request: IAdapterRequest): HookData {
        return {};
    }

    public async execute(
        request: IAdapterRequest,
        context: ICoreActionContext,
        options: ActionOptions
    ): Promise<IAdapterResponse> {
        const { tableMetadata, logger } = context;
        const { operationType, includeId = false, statusCode = 200 } = options;

        const requestId = request.requestId || 'unknown';
        const startTime = Date.now();
        const id = includeId ? request.params.id : undefined;

        try {
            // Initial logging
            this.logStart(logger, requestId, tableMetadata.name, operationType, request, id);

            // Execute beforeOperation hook
            const beforeHookResult = await this.executeBeforeHook(
                request,
                context,
                operationType,
                requestId,
                startTime
            );

            // If beforeHook returned an error response, return it immediately
            if (beforeHookResult) {
                return beforeHookResult;
            }

            // Execute core operation
            const result = await this.executeCore(request, context);

            // Execute afterOperation hook
            const afterHookResult = await this.executeAfterHook(
                request,
                context,
                operationType,
                result,
                requestId,
                startTime
            );

            // If afterHook returned an error response, return it immediately
            if (afterHookResult.error) {
                return afterHookResult.error;
            }

            // Success logging
            this.logSuccess(logger, requestId, tableMetadata.name, operationType, startTime, id);

            return createAdapterResponse(afterHookResult.result, statusCode);

        } catch (error: any) {
            return this.handleError(error, requestId, tableMetadata.name, operationType, startTime, id, logger);
        }
    }

    private async executeBeforeHook(
        request: IAdapterRequest,
        context: ICoreActionContext,
        operationType: OperationTypeEnum,
        requestId: string,
        startTime: number
    ): Promise<IAdapterResponse | null> {
        const { tableMetadata, primaryKeyColumn, columns, tableConfig, logger } = context;

        if (!tableConfig?.hooks?.beforeOperation) return null;

        const hookContext = createCoreHookContext(
            request,
            operationType,
            tableMetadata,
            primaryKeyColumn,
            columns,
            this.createHookData(request)
        );

        try {
            await tableConfig.hooks.beforeOperation(hookContext);
            return null; // Success, continue with operation
        } catch (hookError) {
            logger.error({
                requestId,
                table: tableMetadata.name,
                duration: Date.now() - startTime,
                error: hookError
            }, `${operationType} request failed in beforeOperation hook`);

            return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
        }
    }

    private async executeAfterHook(
        request: IAdapterRequest,
        context: ICoreActionContext,
        operationType: OperationTypeEnum,
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
            operationType,
            tableMetadata,
            primaryKeyColumn,
            columns,
            this.createHookData(request)
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
            }, `${operationType} request failed in afterOperation hook`);

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
        operation: OperationTypeEnum,
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

        logger.debug(logData, `Processing ${operation} request`);
    }

    protected logSuccess(
        logger: any,
        requestId: string,
        tableName: string,
        operation: OperationTypeEnum,
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

        logger.info(logData, `${operation} request completed successfully`);
    }

    private handleError(
        error: any,
        requestId: string,
        tableName: string,
        operation: OperationTypeEnum,
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

        logger.error(logData, `${operation} request failed`);

        return CoreErrorHandler.handleError(error, operation.toLowerCase(), requestId);
    }

    protected handleNotFound(requestId: string, tableName: string, operation: OperationTypeEnum, startTime: number, id: string, logger: any): IAdapterResponse {
        const duration = Date.now() - startTime;
        logger.info({
            requestId,
            table: tableName,
            id,
            duration
        }, `${operation} request: record not found`);

        return CoreErrorHandler.handleNotFound('Record not found', requestId);
    }
}

/**
 * Utility function for creating simple action handlers
 */
export function createActionHandler(
    executeCore: (request: IAdapterRequest, context: ICoreActionContext) => Promise<any>,
    options: ActionOptions,
    createHookData?: (request: IAdapterRequest) => HookData
): ICoreActionHandler {
    const action = new (class extends BaseAction {
        protected async executeCore(request: IAdapterRequest, context: ICoreActionContext): Promise<any> {
            return executeCore(request, context);
        }

        protected createHookData(_request: IAdapterRequest): HookData {
            return createHookData ? createHookData(_request) : {};
        }
    })();

    return (request: IAdapterRequest, context: ICoreActionContext) =>
        action.execute(request, context, options);
}
