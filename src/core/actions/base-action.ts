import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { CoreErrorHandler } from '../utils/core-error-handler';
import { AdapterRequest, AdapterResponse, createDrizzleResponse } from '../web-api';

export interface ActionOptions {
    operationType: OperationType;
    operationName: string;
    includeId?: boolean;
    statusCode?: number;
}

export interface HookData {
    record?: any;
    recordId?: string;
    filters?: any;
}

/**
 * Base class providing common action patterns
 */
export abstract class BaseAction {
    protected abstract executeCore(
        request: AdapterRequest,
        context: CoreActionContext
    ): Promise<any>;

    protected createHookData(_request: AdapterRequest): HookData {
        return {};
    }

    public async execute(
        request: AdapterRequest,
        context: CoreActionContext,
        options: ActionOptions
    ): Promise<AdapterResponse> {
        const { tableMetadata, logger } = context;
        const { operationType, operationName, includeId = false, statusCode = 200 } = options;

        const requestId = request.requestId || 'unknown';
        const startTime = Date.now();
        const id = includeId ? request.params.id : undefined;

        try {
            // Initial logging
            this.logStart(logger, requestId, tableMetadata.name, operationName, request, id);

            // Execute beforeOperation hook
            const beforeHookResult = await this.executeBeforeHook(
                request,
                context,
                operationType,
                requestId,
                startTime,
                operationName
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
                startTime,
                operationName
            );

            // If afterHook returned an error response, return it immediately
            if (afterHookResult.error) {
                return afterHookResult.error;
            }

            // Success logging
            this.logSuccess(logger, requestId, tableMetadata.name, operationName, startTime, id);

            return createDrizzleResponse(afterHookResult.result, statusCode);

        } catch (error: any) {
            return this.handleError(error, requestId, tableMetadata.name, operationName, startTime, id, logger);
        }
    }

    private async executeBeforeHook(
        request: AdapterRequest,
        context: CoreActionContext,
        operationType: OperationType,
        requestId: string,
        startTime: number,
        operationName: string
    ): Promise<AdapterResponse | null> {
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
            }, `${operationName} request failed in beforeOperation hook`);

            return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
        }
    }

    private async executeAfterHook(
        request: AdapterRequest,
        context: CoreActionContext,
        operationType: OperationType,
        result: any,
        requestId: string,
        startTime: number,
        operationName: string
    ): Promise<{ result: any; error?: AdapterResponse }> {
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
            }, `${operationName} request failed in afterOperation hook`);

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
        operationName: string,
        request: AdapterRequest,
        id?: string
    ): void {
        const logData: any = {
            requestId,
            table: tableName
        };

        if (id) logData.id = id;
        if (request.body) logData.bodyKeys = Object.keys(request.body);
        if (request.query && Object.keys(request.query).length > 0) logData.query = request.query;

        logger.debug(logData, `Processing ${operationName} request`);
    }

    protected logSuccess(
        logger: any,
        requestId: string,
        tableName: string,
        operationName: string,
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

        logger.info(logData, `${operationName} request completed successfully`);
    }

    private handleError(
        error: any,
        requestId: string,
        tableName: string,
        operationName: string,
        startTime: number,
        id: string | undefined,
        logger: any
    ): AdapterResponse {
        const duration = Date.now() - startTime;
        const logData: any = {
            requestId,
            table: tableName,
            duration,
            error: error.message
        };

        if (id) logData.id = id;

        logger.error(logData, `${operationName} request failed`);

        return CoreErrorHandler.handleError(error, operationName.toLowerCase(), requestId);
    }

    protected handleNotFound(requestId: string, tableName: string, operationName: string, startTime: number, id: string, logger: any): AdapterResponse {
        const duration = Date.now() - startTime;
        logger.info({
            requestId,
            table: tableName,
            id,
            duration
        }, `${operationName} request: record not found`);

        return CoreErrorHandler.handleNotFound('Record not found', requestId);
    }
}

/**
 * Utility function for creating simple action handlers
 */
export function createActionHandler(
    executeCore: (request: AdapterRequest, context: CoreActionContext) => Promise<any>,
    options: ActionOptions,
    createHookData?: (request: AdapterRequest) => HookData
): CoreActionHandler {
    const action = new (class extends BaseAction {
        protected async executeCore(request: AdapterRequest, context: CoreActionContext): Promise<any> {
            return executeCore(request, context);
        }

        protected createHookData(_request: AdapterRequest): HookData {
            return createHookData ? createHookData(_request) : {};
        }
    })();

    return (request: AdapterRequest, context: CoreActionContext) =>
        action.execute(request, context, options);
}
