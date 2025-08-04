import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { ActionTypeEnum } from '../core/actions/action.types';
import { IAdapterRequest, IAdapterResponse } from '../core/types/adapter.types';
import { IFrameworkAdapter } from '../core/types/adapter.types';

export interface HookContext {
    req: ExpressRequest & { user?: any };           // Access to req.user from framework auth
    res: ExpressResponse;          // Access to response object
    action: ActionTypeEnum;
    table: string;          // Table name
    record?: any;           // For CREATE/UPDATE actions
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
