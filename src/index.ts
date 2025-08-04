// Framework-agnostic core exports
export type { ICoreRestAdapterOptions, IFrameworkAdapter } from './core/adapter';
export { CoreRestAdapter } from './core/adapter';

// Framework-specific exports
export { ExpressAdapter } from './adapters/express-adapter';
export { createExpressDrizzleRestAdapter } from './express';
