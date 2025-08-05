import { PgliteDatabase } from 'drizzle-orm/pglite';

import { ICoreTableContext } from '../actions/action.types';
import { IRequestContext } from './adapter.types';

/**
 * Framework-agnostic database type
 */
export type DrizzleDb = PgliteDatabase<any>;

/**
 * Framework-agnostic action/route handler interface
 * Unified interface for both action handlers and route handlers
 */
export interface ICoreActionHandler {
    (tableContext: ICoreTableContext, requestContext: IRequestContext): Promise<Response>;
}

/**
 * Bound action handler that only needs request context
 */
export interface IBoundActionHandler {
    (requestContext: IRequestContext): Promise<Response>;
}

/**
 * Route handler for a specific HTTP method and path
 * Contains the bound action handler that has the table context already injected
 */
export interface IRouteHandler {
    method: string;
    path: string;
    actionHandler: IBoundActionHandler;
}
