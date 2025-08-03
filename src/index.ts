// Framework-agnostic core exports
export type { ICoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter } from './core/adapter';
export type { IAdapterRequest, IAdapterResponse } from './core/adapter-api';
export type { IFrameworkAdapter } from './core/types/framework-adapter';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
