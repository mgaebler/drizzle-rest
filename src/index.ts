// Main library exports (backward compatible)
export type { DrizzleRestAdapterOptions } from './drizzle-rest-adapter';
export { createDrizzleRestAdapter } from './drizzle-rest-adapter';

// Framework-agnostic core exports
export type { FrameworkAdapter } from './adapters/framework-adapter';
export type { CoreDrizzleRestAdapterOptions } from './core/adapter';
export { CoreDrizzleRestAdapter, createCoreDrizzleRestAdapter } from './core/adapter';
export type { DrizzleRequest, DrizzleResponse } from './core/web-api-types';

// Framework-specific exports
export type { ExpressDrizzleRestAdapterOptions } from './express';
export { createExpressDrizzleRestAdapter } from './express';

// Adapters
export { ExpressAdapter } from './adapters/express-adapter';

// Hook utilities (updated for core compatibility)
export { createCoreHookContext } from './core/hook-context';
export { createHookContext } from './core/utils/hook-context';

// Logging utilities
export type { Logger, LoggerOptions } from './utils/logger';
export { createLogger, defaultLogger } from './utils/logger';

// Security utilities
export { sanitizeObject, sanitizeQueryParams, sanitizeString } from './core/utils/input-sanitizer';
