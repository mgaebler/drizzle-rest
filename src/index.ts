// Framework-agnostic core exports
export type { ICoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter } from './core/adapter';
export type { IFrameworkAdapter } from './core/types/adapter.types';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
