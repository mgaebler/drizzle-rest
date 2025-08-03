// Framework-agnostic core exports
export type { IFrameworkAdapter } from './adapters/framework-adapter';
export type { ICoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter } from './core/adapter';
export type { IAdapterRequest, IAdapterResponse } from './core/adapter-api';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
