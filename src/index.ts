// Framework-agnostic core exports
export type { ICoreRestAdapterOptions as ICoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreRestAdapter as CoreDrizzleRestAdapter } from './core/adapter';
export type { IFrameworkAdapter } from './core/types/adapter.types';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
