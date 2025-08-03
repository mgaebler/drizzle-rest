// Framework-agnostic core exports
export type { IFrameworkAdapter } from './adapters/framework-adapter';
export type { ICoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter, createCoreDrizzleRestAdapter } from './core/adapter';
export type { IAdapterRequest, IAdapterResponse } from './core/adapter-api';

// Handler types and interfaces (consolidated)
export type {
    ICoreActionContext as CoreActionContext,
    ICoreActionHandler as CoreActionHandler,
    DrizzleDb,
    IDrizzleRestHandler as DrizzleRestHandler,
    IRouteHandler as RouteHandler
} from './core/handler.types';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
