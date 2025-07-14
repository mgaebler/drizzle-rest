import { NextFunction, Request, Response } from 'express';

import { Logger } from './logger';

export interface RequestLogOptions {
    /** Include request body in logs (be careful with sensitive data) */
    logBody?: boolean;
    /** Include response body in logs (can be verbose) */
    logResponseBody?: boolean;
    /** Include query parameters in logs */
    logQuery?: boolean;
    /** Include request headers in logs */
    logHeaders?: boolean;
    /** Maximum body size to log (in characters) */
    maxBodySize?: number;
    /** Custom request ID header name */
    requestIdHeader?: string;
}

/**
 * Express middleware for request/response logging with Pino
 */
export function requestLoggingMiddleware(
    logger: Logger,
    options: RequestLogOptions = {}
) {
    const {
        logBody = false,
        logResponseBody = false,
        logQuery = true,
        logHeaders = false,
        maxBodySize = 1000,
        requestIdHeader = 'x-request-id'
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const startTime = Date.now();

        // Generate or extract request ID
        const requestId = req.headers[requestIdHeader] ||
            req.headers['x-correlation-id'] ||
            generateRequestId();

        // Add request ID to request for use in other parts of the app
        (req as any).requestId = requestId;

        // Prepare request log data
        const requestLog: any = {
            requestId,
            method: req.method,
            url: req.url,
            path: req.path,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress,
        };

        if (logQuery && Object.keys(req.query).length > 0) {
            requestLog.query = req.query;
        }

        if (logHeaders) {
            requestLog.headers = sanitizeHeaders(req.headers);
        }

        if (logBody && req.body) {
            requestLog.body = truncateBody(req.body, maxBodySize);
        }

        // Log incoming request
        logger.info(requestLog, 'Incoming request');

        // Capture original res.json to log response
        const originalJson = res.json;
        let responseBody: any;

        res.json = function (body: any) {
            responseBody = body;
            return originalJson.call(this, body);
        };

        // Override res.end to log when response is complete
        const originalEnd = res.end.bind(res);
        res.end = (...args: any[]): Response => {
            const duration = Date.now() - startTime;

            const responseLog: any = {
                requestId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration,
                contentLength: res.get('content-length')
            };

            if (logResponseBody && responseBody) {
                responseLog.responseBody = truncateBody(responseBody, maxBodySize);
            }

            // Log based on status code
            if (res.statusCode >= 500) {
                logger.error(responseLog, 'Request completed with server error');
            } else if (res.statusCode >= 400) {
                logger.warn(responseLog, 'Request completed with client error');
            } else {
                logger.info(responseLog, 'Request completed successfully');
            }

            return originalEnd(...args);
        };

        next();
    };
}

/**
 * Generate a simple request ID
 */
function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

/**
 * Sanitize headers by removing sensitive information
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = [
        'authorization',
        'cookie',
        'x-api-key',
        'x-auth-token',
        'password'
    ];

    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    });

    return sanitized;
}

/**
 * Truncate body content for logging
 */
function truncateBody(body: any, maxSize: number): any {
    if (typeof body === 'string') {
        return body.length > maxSize ?
            body.substring(0, maxSize) + '...[truncated]' :
            body;
    }

    if (typeof body === 'object') {
        const stringified = JSON.stringify(body);
        return stringified.length > maxSize ?
            stringified.substring(0, maxSize) + '...[truncated]' :
            body;
    }

    return body;
}
