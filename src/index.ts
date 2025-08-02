// Framework-agnostic core exports
export type { FrameworkAdapter } from './adapters/framework-adapter';
export type { CoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter, createCoreDrizzleRestAdapter } from './core/adapter';
export type { DrizzleRequest, DrizzleResponse } from './core/web-api-types';

// Framework-specific exports
export type { ExpressDrizzleRestAdapterOptions } from './express';
export { createExpressDrizzleRestAdapter } from './express';
