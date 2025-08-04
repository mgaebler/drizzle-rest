import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

import { ActionTypeEnum } from '../core/actions/action.types';

/**
 * Express-specific hook context interface
 * Used in Express adapter hooks to provide access to Express-specific objects
 */
export interface HookContext {
    req: ExpressRequest & { user?: any };  // Access to req.user from framework auth
    res: ExpressResponse;                   // Access to response object
    action: ActionTypeEnum;
    table: string;                          // Table name
    record?: any;                           // For CREATE/UPDATE actions
}
