import { createCoreHookContext } from '../hook-context';
import type { IAdapterRequest, IAdapterResponse } from '../types/adapter.types';
import { ICoreActionContext } from '../types/handler.types';
import { createAdapterResponse } from '../utils/response-helper';
import { ActionOptions, ActionTypeEnum } from './action.types';

/**
 * Base class providing common action patterns and error handling abstractions
 *
 * Error Handling Philosophy:
 * - Errors are handled close to their execution context for better debugging
 * - Consistent error response structure across all actions
 * - Proper logging with contextual information
 * - Type-specific error handling (validation, not found, conflicts, etc.)
 *
 * Available Error Abstractions:
 * - createNotFoundError(): For 404 responses with contextual logging
 * - createValidationError(): For 400 validation errors with Zod integration
 * - createBadRequestError(): For 400 client errors with custom messages
 * - createConflictError(): For 409 conflict errors (e.g., duplicates)
 * - createInternalError(): For 500 server errors with detailed logging
 * - handleValidationError(): Smart handler for validation and DB constraint errors
 */
export abstract class BaseAction {
    /** Parsed request parameters (e.g., route params like :id) */
    protected params: Record<string, any> = {};
    /** Parsed query parameters from URL search params */
    protected query: Record<string, any> = {};
    /** Parsed request body */
    protected body: any = null;
    /** Current request ID for tracking and logging */
    protected requestId: string = 'unknown';
    /** Current action context for error handling */
    protected currentContext: ICoreActionContext | null = null;

    protected abstract executeCore(
        context: ICoreActionContext
    ): Promise<any>;

    protected getCurrentRequestId(): string {
        return this.requestId;
    }

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
        this.requestId = request.requestId || 'unknown';
        this.currentContext = context;

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

            // Check if the result is already an error response (when action handles its own errors)
            if (result && typeof result === 'object' && 'status' in result && result.status >= 400) {
                return result;
            }

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
        } catch (hookError: any) {
            const duration = Date.now() - startTime;

            logger.error({
                requestId,
                table: tableMetadata.name,
                duration,
                hook: 'beforeOperation',
                error: {
                    message: hookError.message || hookError,
                    ...(process.env.NODE_ENV === 'development' && { stack: hookError.stack })
                }
            }, `${actionType} request failed in beforeOperation hook`);

            // Hook errors during beforeOperation are typically authorization/validation issues
            const statusCode = 403; // Forbidden
            const errorMessage = typeof hookError === 'string' ? hookError :
                hookError.message || 'Authorization failed in beforeOperation hook';

            return createAdapterResponse({
                error: errorMessage,
                requestId
            }, statusCode);
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
        } catch (hookError: any) {
            const duration = Date.now() - startTime;

            logger.error({
                requestId,
                table: tableMetadata.name,
                duration,
                hook: 'afterOperation',
                error: {
                    message: hookError.message || hookError,
                    ...(process.env.NODE_ENV === 'development' && { stack: hookError.stack })
                }
            }, `${actionType} request failed in afterOperation hook`);

            // Hook errors during afterOperation are typically processing issues
            const statusCode = 500; // Internal Server Error
            const errorMessage = typeof hookError === 'string' ? hookError :
                hookError.message || 'Processing failed in afterOperation hook';

            return {
                result: null,
                error: createAdapterResponse({
                    error: errorMessage,
                    requestId
                }, statusCode)
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
            action,
            error: {
                message: error.message,
                code: error.code,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            }
        };

        if (id) logData.id = id;

        logger.error(logData, `Unexpected error in ${action} request`);

        // This should only handle truly unexpected errors now
        // Most specific errors should be handled in the individual actions
        return createAdapterResponse({
            error: 'Internal Server Error',
            requestId
        }, 500);
    }

    // Error handling abstractions for actions
    protected createNotFoundError(message = 'Record not found', context?: any): IAdapterResponse {
        const { tableMetadata, logger } = this.currentContext!;

        logger.info({
            requestId: this.requestId,
            table: tableMetadata.name,
            ...context
        }, message);

        return createAdapterResponse({
            error: message,
            requestId: this.requestId
        }, 404);
    }

    protected createValidationError(error: any, context?: any): IAdapterResponse {
        const { tableMetadata, logger } = this.currentContext!;

        logger.warn({
            requestId: this.requestId,
            table: tableMetadata.name,
            validationIssues: error.issues,
            ...context
        }, 'Validation failed');

        return createAdapterResponse({
            error: 'Validation failed',
            details: error.issues,
            requestId: this.requestId
        }, 400);
    }

    protected createBadRequestError(message: string, context?: any): IAdapterResponse {
        const { tableMetadata, logger } = this.currentContext!;

        logger.warn({
            requestId: this.requestId,
            table: tableMetadata.name,
            ...context
        }, message);

        return createAdapterResponse({
            error: message,
            requestId: this.requestId
        }, 400);
    }

    protected createInternalError(error: any, message = 'Internal Server Error', context?: any): IAdapterResponse {
        const { tableMetadata, logger } = this.currentContext!;

        logger.error({
            requestId: this.requestId,
            table: tableMetadata.name,
            error: {
                message: error.message,
                code: error.code,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            },
            ...context
        }, message);

        return createAdapterResponse({
            error: message,
            requestId: this.requestId
        }, 500);
    }

    protected createConflictError(message: string, context?: any): IAdapterResponse {
        const { tableMetadata, logger } = this.currentContext!;

        logger.warn({
            requestId: this.requestId,
            table: tableMetadata.name,
            ...context
        }, message);

        return createAdapterResponse({
            error: message,
            requestId: this.requestId
        }, 409);
    }

    // Helper method to handle validation errors with consistent structure
    protected handleValidationError(error: any, context?: any): IAdapterResponse {
        if (error.issues) {
            return this.createValidationError(error, context);
        }

        // Handle database constraint errors
        if (error.code === '23505') { // PostgreSQL unique constraint violation
            return this.createConflictError('A record with this value already exists', context);
        }

        if (error.code === '23503') { // PostgreSQL foreign key constraint violation
            return this.createBadRequestError('Referenced record does not exist', context);
        }

        if (error.code === '23514') { // PostgreSQL check constraint violation
            return this.createBadRequestError('Data does not meet validation requirements', context);
        }

        // Re-throw unknown errors to be handled by base class
        throw error;
    }
}

