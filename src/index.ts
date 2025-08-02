// Main library exports (backward compatible)
export type { DrizzleRestAdapterOptions } from './drizzle-rest-adapter';
export { createDrizzleRestAdapter } from './drizzle-rest-adapter';

// Framework-agnostic core exports
export type { CoreDrizzleRestAdapterOptions } from './core/adapter';
export { createCoreDrizzleRestAdapter, CoreDrizzleRestAdapter } from './core/adapter';
export type { DrizzleRequest, DrizzleResponse } from './core/web-api-types';
export type { FrameworkAdapter } from './adapters/framework-adapter';

// Framework-specific exports
export type { ExpressDrizzleRestAdapterOptions } from './express';
export { createExpressDrizzleRestAdapter } from './express';

// Adapters
export { ExpressAdapter } from './adapters/express-adapter';

// Hook utilities (updated for core compatibility)
export { createHookContext } from './utils/hook-context';
export { createCoreHookContext } from './core/hook-context';

// Logging utilities
export type { Logger, LoggerOptions } from './utils/logger';
export { createLogger, defaultLogger } from './utils/logger';

// Security utilities
export { sanitizeObject, sanitizeQueryParams, sanitizeString } from './utils/input-sanitizer';
