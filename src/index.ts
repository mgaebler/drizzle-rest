// Framework-agnostic core exports
export type { ICoreRestAdapterOptions } from './core/adapter';
export { CoreRestAdapter } from './core/adapter';
export type { IFrameworkAdapter } from './core/types/adapter.types';

// Framework-specific exports
export { createExpressDrizzleRestAdapter } from './express';
