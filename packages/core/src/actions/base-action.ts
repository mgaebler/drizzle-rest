import type { Logger } from '../logger';
import type { IAdapterResponse, IRequestContext } from '../types/adapter.types';
import { createAdapterResponse } from '../utils/response-helper';
import type { ActionTypeEnum, ICoreTableContext } from './action.types';

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
    /** Current logger instance */
    protected logger: Logger;
    /** Current table context for error handling */
    protected currentTableContext: ICoreTableContext | null = null;
    /** Current request context for error handling */
    protected currentRequestContext: IRequestContext | null = null;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    protected abstract runDatabaseQuery(tableContext: ICoreTableContext): Promise<any>;

    /** Get the action type for this specific action */
    protected abstract getActionType(): ActionTypeEnum;

    /** Get the HTTP status code for this specific action */
    protected abstract getStatusCode(): number;

    protected getCurrentRequestId(): string {
        return this.requestId;
    }

    public async execute(tableContext: ICoreTableContext, requestContext: IRequestContext): Promise<Response> {
        const { tableMetadata } = tableContext;
        const actionType = this.getActionType();
        const statusCode = this.getStatusCode();

        // Parse request data and make available to subclasses
        this.params = requestContext.params || {};
        this.query = requestContext.query || {};
        this.body = requestContext.parsedBody || null;
        this.requestId = requestContext.requestId || 'unknown';

        // Store contexts for error handling
        this.currentTableContext = tableContext;
        this.currentRequestContext = requestContext;

        const requestId = requestContext.requestId || 'unknown';
        const startTime = Date.now();
        const id = this.params.id; // Always try to get ID from params for logging

        try {
            // Initial logging
            this.logStart(requestId, tableMetadata.name, actionType, id);

            // Execute beforeAction hook
            const beforeHookResult = await this.executeBeforeHook(
                tableContext,
                requestContext,
                actionType,
                requestId,
                startTime,
            );

            // If beforeHook returned an error response, return it immediately
            if (beforeHookResult) {
                return beforeHookResult;
            }

            // Execute core action with table context only (request data available via instance variables)
            const result = await this.runDatabaseQuery(tableContext);

            // Check if the result is already an error response (when action handles its own errors)
            if (result && typeof result === 'object' && 'status' in result && result.status >= 400) {
                return result;
            }

            // Execute afterAction hook
            const afterHookResult = await this.executeAfterHook(
                tableContext,
                requestContext,
                actionType,
                result,
                requestId,
                startTime,
            );

            // If afterHook returned an error response, return it immediately
            if (afterHookResult.error) {
                return afterHookResult.error;
            }

            // Success logging
            this.logSuccess(requestId, tableMetadata.name, actionType, startTime, id);

            // Allow subclasses to customize response creation
            return this.createResponse(afterHookResult.result, statusCode);
        } catch (error: any) {
            return this.handleError(error, requestId, tableMetadata.name, actionType, startTime, id);
        }
    }

    private async executeBeforeHook(
        tableContext: ICoreTableContext,
        requestContext: IRequestContext,
        actionType: ActionTypeEnum,
        requestId: string,
        startTime: number,
    ): Promise<IAdapterResponse | null> {
        const { tableMetadata, tableConfig } = tableContext;

        if (!tableConfig?.hooks?.beforeOperation) return null;

        try {
            await tableConfig.hooks.beforeOperation(tableContext, requestContext);
            return null; // Success, continue with action
        } catch (hookError: any) {
            const duration = Date.now() - startTime;

            this.logger.error(
                {
                    requestId,
                    table: tableMetadata.name,
                    duration,
                    hook: 'beforeOperation',
                    error: {
                        message: hookError.message || hookError,
                        ...(process.env.NODE_ENV === 'development' && { stack: hookError.stack }),
                    },
                },
                `${actionType} request failed in beforeOperation hook`,
            );

            // Hook errors during beforeOperation are typically authorization/validation issues
            const statusCode = 403; // Forbidden
            const errorMessage =
                typeof hookError === 'string'
                    ? hookError
                    : hookError.message || 'Authorization failed in beforeOperation hook';

            return createAdapterResponse(
                {
                    error: errorMessage,
                    requestId,
                },
                statusCode,
            );
        }
    }

    private async executeAfterHook(
        tableContext: ICoreTableContext,
        requestContext: IRequestContext,
        actionType: ActionTypeEnum,
        result: any,
        requestId: string,
        startTime: number,
    ): Promise<{ result: any; error?: IAdapterResponse }> {
        const { tableMetadata, tableConfig } = tableContext;

        if (!tableConfig?.hooks?.afterOperation) {
            return { result };
        }

        try {
            if (Array.isArray(result)) {
                // Handle array results (like GET_MANY)
                const processedResult = await Promise.all(
                    result.map((item: any) => tableConfig.hooks?.afterOperation?.(tableContext, requestContext, item)),
                );
                return { result: processedResult };
            } else {
                // Handle single results
                const processedResult = await tableConfig.hooks.afterOperation(tableContext, requestContext, result);
                return { result: processedResult };
            }
        } catch (hookError: any) {
            const duration = Date.now() - startTime;

            this.logger.error(
                {
                    requestId,
                    table: tableMetadata.name,
                    duration,
                    hook: 'afterOperation',
                    error: {
                        message: hookError.message || hookError,
                        ...(process.env.NODE_ENV === 'development' && { stack: hookError.stack }),
                    },
                },
                `${actionType} request failed in afterOperation hook`,
            );

            // Hook errors during afterOperation are typically processing issues
            const statusCode = 500; // Internal Server Error
            const errorMessage =
                typeof hookError === 'string'
                    ? hookError
                    : hookError.message || 'Processing failed in afterOperation hook';

            return {
                result: null,
                error: createAdapterResponse(
                    {
                        error: errorMessage,
                        requestId,
                    },
                    statusCode,
                ),
            };
        }
    }

    /**
     * Creates the response for this action. Subclasses can override this to customize response formatting.
     */
    protected createResponse(result: any, statusCode: number): IAdapterResponse {
        return createAdapterResponse(result, statusCode);
    }

    /**
     * Logging helpers
     */

    protected logStart(requestId: string, tableName: string, action: ActionTypeEnum, id?: string): void {
        const logData: any = {
            requestId,
            table: tableName,
        };

        if (id) logData.id = id;
        if (this.body) logData.bodyKeys = Object.keys(this.body);
        if (this.query && Object.keys(this.query).length > 0) logData.query = this.query;

        this.logger.debug(logData, `Processing ${action} request`);
    }

    protected logSuccess(
        requestId: string,
        tableName: string,
        action: ActionTypeEnum,
        startTime: number,
        id?: string,
    ): void {
        const duration = Date.now() - startTime;
        const logData: any = {
            requestId,
            table: tableName,
            duration,
        };

        if (id) logData.id = id;

        this.logger.info(logData, `${action} request completed successfully`);
    }

    /**
     * Centralized error handling
     */

    private handleError(
        error: any,
        requestId: string,
        tableName: string,
        action: ActionTypeEnum,
        startTime: number,
        id: string | undefined,
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
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
            },
        };

        if (id) logData.id = id;

        this.logger.error(logData, `Unexpected error in ${action} request`);

        // This should only handle truly unexpected errors now
        // Most specific errors should be handled in the individual actions
        return createAdapterResponse(
            {
                error: 'Internal Server Error',
                requestId,
            },
            500,
        );
    }

    // Error handling abstractions for actions
    protected createNotFoundError(message = 'Record not found', context?: any): IAdapterResponse {
        const { tableMetadata } = this.currentTableContext!;

        this.logger.info(
            {
                requestId: this.requestId,
                table: tableMetadata.name,
                ...context,
            },
            message,
        );

        return createAdapterResponse(
            {
                error: message,
                requestId: this.requestId,
            },
            404,
        );
    }

    protected createValidationError(error: any, context?: any): IAdapterResponse {
        const { tableMetadata } = this.currentTableContext!;

        this.logger.warn(
            {
                requestId: this.requestId,
                table: tableMetadata.name,
                validationIssues: error.issues,
                ...context,
            },
            'Validation failed',
        );

        return createAdapterResponse(
            {
                error: 'Validation failed',
                details: error.issues,
                requestId: this.requestId,
            },
            400,
        );
    }

    protected createBadRequestError(message: string, context?: any): IAdapterResponse {
        const { tableMetadata } = this.currentTableContext!;

        this.logger.warn(
            {
                requestId: this.requestId,
                table: tableMetadata.name,
                ...context,
            },
            message,
        );

        return createAdapterResponse(
            {
                error: message,
                requestId: this.requestId,
            },
            400,
        );
    }

    protected createInternalError(error: any, message = 'Internal Server Error', context?: any): IAdapterResponse {
        const { tableMetadata } = this.currentTableContext!;

        this.logger.error(
            {
                requestId: this.requestId,
                table: tableMetadata.name,
                error: {
                    message: error.message,
                    code: error.code,
                    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
                },
                ...context,
            },
            message,
        );

        return createAdapterResponse(
            {
                error: message,
                requestId: this.requestId,
            },
            500,
        );
    }

    protected createConflictError(message: string, context?: any): IAdapterResponse {
        const { tableMetadata } = this.currentTableContext!;

        this.logger.warn(
            {
                requestId: this.requestId,
                table: tableMetadata.name,
                ...context,
            },
            message,
        );

        return createAdapterResponse(
            {
                error: message,
                requestId: this.requestId,
            },
            409,
        );
    }

    // Helper method to handle validation errors with consistent structure
    protected handleValidationError(error: any, context?: any): IAdapterResponse {
        if (error.issues) {
            return this.createValidationError(error, context);
        }

        // Handle database constraint errors
        if (error.code === '23505') {
            // PostgreSQL unique constraint violation
            return this.createConflictError('A record with this value already exists', context);
        }

        if (error.code === '23503') {
            // PostgreSQL foreign key constraint violation
            return this.createBadRequestError('Referenced record does not exist', context);
        }

        if (error.code === '23514') {
            // PostgreSQL check constraint violation
            return this.createBadRequestError('Data does not meet validation requirements', context);
        }

        // Re-throw unknown errors to be handled by base class
        throw error;
    }
}
