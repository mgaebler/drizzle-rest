import { PgliteDatabase } from 'drizzle-orm/pglite';

import { ICoreRequestContext, ICoreTableContext } from '../actions/action.types';

/**
 * Framework-agnostic database type
 */
export type DrizzleDb = PgliteDatabase<any>;

/**
 * Framework-agnostic action/route handler interface
 * Unified interface for both action handlers and route handlers
 */
export interface ICoreActionHandler {
    (context: ICoreRequestContext): Promise<Response>;
}

/**
 * Route handler for a specific HTTP method and path
 * Contains both the action handler and the table context needed to create unified context
 */
export interface IRouteHandler {
    method: string;
    path: string;
    actionHandler: ICoreActionHandler;
    tableContext: ICoreTableContext;
}
