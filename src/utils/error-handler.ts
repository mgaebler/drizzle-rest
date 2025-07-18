import { Response } from 'express';

import { defaultLogger, Logger } from './logger';

export class ErrorHandler {
    private static logger: Logger = defaultLogger;

    static setLogger(logger: Logger): void {
        this.logger = logger;
    }

    static handleError(res: Response, error: any, operation: string, requestId?: string): void {
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
            res.status(statusCode).json({
                error: errorMessage,
                requestId
            });
            return;
        }

        if (error.issues) {
            // Zod validation error
            this.logger.warn(errorContext, `Validation error in ${operation}`);
            res.status(400).json({
                error: 'Validation failed',
                details: error.issues,
                requestId
            });
            return;
        }

        if (error.message?.includes('not found') || error.code === 'P2025') {
            // Not found error
            this.logger.info(errorContext, `Resource not found in ${operation}`);
            res.status(404).json({
                error: 'Not Found',
                requestId
            });
            return;
        }

        // Generic server error
        this.logger.error(errorContext, `Server error in ${operation}`);
        res.status(500).json({
            error: 'Internal Server Error',
            requestId
        });
    }

    static handleNotFound(res: Response, message = 'Not Found', requestId?: string): void {
        this.logger.info({
            requestId,
            message
        }, 'Resource not found');

        res.status(404).json({
            error: message,
            requestId
        });
    }

    static handleValidationError(res: Response, error: any, requestId?: string): void {
        this.logger.warn({
            requestId,
            error: {
                message: error.message,
                issues: error.issues
            }
        }, 'Validation error occurred');

        res.status(400).json({
            error: 'Validation failed',
            details: error.issues || error.message,
            requestId
        });
    }
}
