// Framework-agnostic core exports
export type { FrameworkAdapter } from './adapters/framework-adapter';
export type { CoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter, createCoreDrizzleRestAdapter } from './core/adapter';
export type { AdapterRequest as DrizzleRequest, AdapterResponse as DrizzleResponse } from './core/adapter-api';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
