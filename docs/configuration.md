# Configuration

The `createDrizzleRestAdapter` function accepts a configuration object for customization.

## Configuration Interface

```typescript
interface DrizzleRestAdapterOptions {
  /** The Drizzle database instance. Required. */
  db: DrizzleClient;

  /** The imported Drizzle schema object. Required. */
  schema: Record<string, PgTable | MySqlTable | ... | Relations>;

  /**
   * Detailed configuration per table.
   * Allows disabling endpoints and adding security hooks.
   */
  tableOptions?: {
    [tableName: string]: {
      disabledEndpoints?: Array<'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'REPLACE' | 'DELETE'>;

      // Security hooks for authorization (framework authentication required)
      hooks?: {
        beforeOperation?: (context: HookContext) => Promise<void>;
        afterOperation?: (context: HookContext, result: any) => Promise<any>;
      }
    }
  };

  /** Logger instance to use (create with createLogger() if needed) */
  logger?: Logger;
}

interface HookContext {
  req: Request;           // Access to req.user from framework authentication
  operation: 'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'REPLACE' | 'DELETE';
  table: string;          // Table name
  record?: any;           // For CREATE/UPDATE operations
  recordId?: string;      // For GET_ONE/UPDATE/DELETE operations
  filters?: any;          // For GET_MANY operations
  metadata: {
    tableName: string;
    primaryKey: string;
    columns: string[];
  };
}
```

## Configuration Examples

### Basic Configuration

```typescript
const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema
});
```

### Table-Specific Configuration

```typescript
const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  tableOptions: {
    users: {
      // Disable deleting users
      disabledEndpoints: ['DELETE']
    },
    adminLogs: {
      // Admin-only table
      disabledEndpoints: ['GET_MANY', 'GET_ONE', 'CREATE', 'UPDATE', 'DELETE']
    }
  }
});
```

### Configuration with Hooks

```typescript
const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          const { user } = context.req;
          const { operation, recordId } = context;

          // Role-based authorization
          if (operation === 'DELETE' && user.role !== 'admin') {
            throw new Error('Forbidden: Only admins can delete users');
          }

          // Record-level authorization
          if (operation === 'UPDATE' && user.role !== 'admin' && user.id !== recordId) {
            throw new Error('Forbidden: Can only update own profile');
          }
        },
        afterOperation: async (context, result) => {
          // Data filtering based on permissions
          if (context.req.user.role !== 'admin') {
            delete result.passwordHash;
            delete result.internalNotes;
          }
          return result;
        }
      }
    }
  }
});
```
