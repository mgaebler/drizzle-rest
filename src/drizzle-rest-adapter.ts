/**
 * @deprecated This implementation is deprecated. Use createExpressDrizzleRestAdapter from 'drizzle-rest-adapter/express'
 * or the framework-agnostic createCoreDrizzleRestAdapter for new projects.
 * This export is maintained for backward compatibility.
 */
import { createExpressDrizzleRestAdapter, ExpressDrizzleRestAdapterOptions } from './express';

// Re-export the types for backward compatibility
export type { ExpressDrizzleRestAdapterOptions as DrizzleRestAdapterOptions };

/**
 * @deprecated Use createExpressDrizzleRestAdapter or createCoreDrizzleRestAdapter instead
 */
export const createDrizzleRestAdapter = createExpressDrizzleRestAdapter;

