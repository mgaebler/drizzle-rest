# Hook System

The Drizzle REST adapter provides a hook system that allows you to execute custom logic before and after database operations. This enables authorization, data validation, audit logging, and result transformation.

## Overview

- **`beforeOperation`**: Executes before the database operation (authorization, validation)
- **`afterOperation`**: Executes after the database operation (data filtering, transformation)

## Basic Usage

```typescript
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';

const adapter = createDrizzleRestAdapter({
  db,
  schema,
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          // Authorization logic
          if (!context.req.user) {
            throw new Error('Authentication required');
          }
        },
        afterOperation: async (context, result) => {
          // Filter sensitive data
          const { password, ...safeResult } = result;
          return safeResult;
        }
      }
    }
  }
});
```

## Hook Context

The `HookContext` provides access to request information:

```typescript
interface HookContext {
  req: Request & { user?: any };     // Express request with optional user
  res: Response;                     // Express response object
  operation: OperationType;          // 'CREATE', 'GET_ONE', 'GET_MANY', 'UPDATE', 'REPLACE', 'DELETE'
  table: string;                     // Table name
  record?: any;                      // Record data (CREATE/UPDATE operations)
  recordId?: string;                 // Record ID (GET_ONE/UPDATE/DELETE operations)
  filters?: any;                     // Query filters (GET_MANY operations)
  metadata: {
    tableName: string;
    primaryKey: string;
    columns: string[];
  };
}
```

## Authorization Example

```typescript
beforeOperation: async (context) => {
  const user = context.req.user;

  if (!user) {
    throw new Error('Authentication required');
  }

  // Role-based access control
  if (context.operation === 'DELETE' && user.role !== 'admin') {
    throw new Error('Forbidden: Only admins can delete records');
  }

  // Resource ownership check
  if (context.operation === 'UPDATE' && context.recordId !== user.id && user.role !== 'admin') {
    throw new Error('Forbidden: Can only update own records');
  }
}
```

## Data Transformation Example

```typescript
afterOperation: async (context, result) => {
  const user = context.req.user;

  // Filter sensitive data for non-admin users
  if (user?.role !== 'admin') {
    if (Array.isArray(result)) {
      return result.map(record => {
        const { password, ssn, ...filteredRecord } = record;
        return filteredRecord;
      });
    } else {
      const { password, ssn, ...filteredRecord } = result;
      return filteredRecord;
    }
  }

  return result;
}
```

## Error Handling

- **beforeOperation errors**: Return `403 Forbidden` status
- **afterOperation errors**: Return `500 Internal Server Error` status

```typescript
beforeOperation: async (context) => {
  try {
    await validatePermissions(context);
  } catch (error) {
    // Log for debugging, throw user-friendly error
    console.error('Authorization failed:', error);
    throw new Error('Access denied');
  }
}
```

## Complete Example

```typescript
const adapter = createDrizzleRestAdapter({
  db,
  schema,
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          const user = context.req.user;

          if (!user) {
            throw new Error('Authentication required');
          }

          // Auto-populate fields
          if (context.operation === 'CREATE') {
            context.record.createdAt = new Date();
            context.record.createdBy = user.id;
          }

          // Authorization checks
          if (context.operation === 'DELETE' && user.role !== 'admin') {
            throw new Error('Forbidden: Only admins can delete users');
          }
        },

        afterOperation: async (context, result) => {
          const user = context.req.user;

          // Filter sensitive data
          const filterResult = (record) => {
            const { password, resetToken, ...safeRecord } = record;

            // Hide email from non-admin users viewing other profiles
            if (user.role !== 'admin' && record.id !== user.id) {
              const { email, ...publicRecord } = safeRecord;
              return publicRecord;
            }

            return safeRecord;
          };

          return Array.isArray(result) ? result.map(filterResult) : filterResult(result);
        }
      }
    }
  }
});
```

## Integration with Authentication

```typescript
import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();

// Authentication middleware
app.use('/api', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // Invalid token - req.user remains undefined
    }
  }

  next();
});

// Drizzle REST adapter with hooks
app.use('/api/v1', createDrizzleRestAdapter({
  db,
  schema,
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          // Access authenticated user via context.req.user
          if (!context.req.user) {
            throw new Error('Authentication required');
          }
        }
      }
    }
  }
}));
```

This hook system provides a powerful way to implement authorization, data validation, and transformation while keeping your REST API secure and maintainable.
