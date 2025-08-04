import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { OperationTypeEnum } from '../core/actions/operation.types';
import { IAdapterRequest, IAdapterResponse } from '../core/types/adapter.types';
import { IFrameworkAdapter } from '../core/types/adapter.types';

export interface HookContext {
    req: ExpressRequest & { user?: any };           // Access to req.user from framework auth
    res: ExpressResponse;          // Access to response object
    operation: OperationTypeEnum;
    table: string;          // Table name
    record?: any;           // For CREATE/UPDATE operations
    recordId?: string;      // For GET_ONE/UPDATE/DELETE operations
    filters?: any;          // For GET_MANY operations
    metadata: {
        tableName: string;
        primaryKey: string;
        columns: string[];
    };
}

/**
 * Express.js adapter for converting between Express req/res and our internal format
 */
export class ExpressAdapter implements IFrameworkAdapter {
    readonly name = 'express';

    async parseRequest(
        req: ExpressRequest,
        params: Record<string, string> = {}
    ): Promise<IAdapterRequest> {
        // Convert Express headers to plain object
        const headers: Record<string, string> = {};
        Object.entries(req.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
                headers[key] = value;
            } else if (Array.isArray(value)) {
                headers[key] = value.join(', ');
            }
        });

        return {
            method: req.method,
            url: req.url, // Use req.url instead of originalUrl to get path relative to mounted router
            headers,
            params: params || req.params || {},
            query: req.query || {},
            body: req.body,
            requestId: (req as any).requestId
        };
    }

    async sendResponse(
        response: IAdapterResponse,
        res: ExpressResponse
    ): Promise<void> {
        // Set headers
        Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        // Send response
        res.status(response.status).json(response.body);
    }

    extractParams(req: ExpressRequest): Record<string, string> {
        return req.params || {};
    }
}

/**
 * Helper function to create HookContext objects
 * Eliminates code duplication across route handlers
 */
export const createHookContext = (
    req: ExpressRequest,
    res: ExpressResponse,
    operation: OperationTypeEnum,
    tableMetadata: any,
    primaryKeyColumn: string,
    columns: any,
    options: {
        filters?: any;
        record?: any;
        recordId?: string;
    } = {}
): HookContext => {
    return {
        req,
        res,
        operation,
        table: tableMetadata.name,
        filters: options.filters,
        record: options.record,
        recordId: options.recordId,
        metadata: {
            tableName: tableMetadata.name,
            primaryKey: primaryKeyColumn,
            columns: Object.keys(columns)
        }
    };
};
