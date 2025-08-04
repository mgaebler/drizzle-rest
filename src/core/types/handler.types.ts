import { PgliteDatabase } from 'drizzle-orm/pglite';

import { ICoreActionContext } from '../actions/action.types';
import { IAdapterRequest, IAdapterResponse } from './adapter.types';

/**
 * Framework-agnostic database type
 */
export type DrizzleDb = PgliteDatabase<any>;

/**
 * Framework-agnostic action handler interface
 */
export interface ICoreActionHandler {
    (
        request: IAdapterRequest,
        context: ICoreActionContext
    ): Promise<IAdapterResponse>;
}

/**
 * Route handler for a specific HTTP method and path
 */
export interface IRouteHandler {
    method: string;
    path: string;
    handler: (request: IAdapterRequest) => Promise<IAdapterResponse>;
}
