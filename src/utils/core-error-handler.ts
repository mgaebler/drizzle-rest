import { createDrizzleResponse, DrizzleResponse } from '../core/web-api-types';
import { defaultLogger, Logger } from './logger';

export class CoreErrorHandler {
    private static logger: Logger = defaultLogger;

    static setLogger(logger: Logger): void {
        this.logger = logger;
    }

    static handleError(error: any, operation: string, requestId?: string): DrizzleResponse {
        const errorContext = {
            operation,
            requestId,
            error: {
                message: error.message,
                code: error.code,
                // Only include stack trace in development
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
                ...(error.issues && { validationIssues: error.issues })
            }
        };

        // Handle hook-related authorization errors
        if (operation === 'beforeOperation' || operation === 'afterOperation') {
            const statusCode = operation === 'beforeOperation' ? 403 : 500;
            const errorMessage = typeof error === 'string' ? error : error.message || 'Hook execution failed';

            this.logger.warn(errorContext, `Hook error in ${operation}`);
            return createDrizzleResponse({
                error: errorMessage,
                requestId
            }, statusCode);
        }

        if (error.issues) {
            // Zod validation error
            this.logger.warn(errorContext, `Validation error in ${operation}`);
            return createDrizzleResponse({
                error: 'Validation failed',
                details: error.issues,
                requestId
            }, 400);
        }

        if (error.message?.includes('not found') || error.code === 'P2025') {
            // Not found error
            this.logger.info(errorContext, `Resource not found in ${operation}`);
            return createDrizzleResponse({
                error: 'Not Found',
                requestId
            }, 404);
        }

        // Generic server error
        this.logger.error(errorContext, `Server error in ${operation}`);
        return createDrizzleResponse({
            error: 'Internal Server Error',
            requestId
        }, 500);
    }

    static handleNotFound(message = 'Not Found', requestId?: string): DrizzleResponse {
        this.logger.info({
            requestId,
            message
        }, 'Resource not found');

        return createDrizzleResponse({
            error: message,
            requestId
        }, 404);
    }

    static handleValidationError(error: any, requestId?: string): DrizzleResponse {
        this.logger.warn({
            requestId,
            error: {
                message: error.message,
                issues: error.issues
            }
        }, 'Validation error occurred');

        return createDrizzleResponse({
            error: 'Validation failed',
            details: error.issues || error.message,
            requestId
        }, 400);
    }
}
