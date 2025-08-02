# Security Architecture

## Security Model

The Drizzle REST Adapter follows a **layered security approach**:

1. **Framework Layer**: Handles authentication (JWT, OAuth, sessions)
2. **Adapter Layer**: Handles authorization via hooks
3. **Database Layer**: Leverages Drizzle's type-safe query building

## Authorization via Hooks

**Key Finding**: During implementation, we discovered that the planned hook system is the **perfect solution for authorization**. Rather than building a separate authorization framework, hooks provide:

- **Framework Agnostic**: Works with any authentication system
- **Maximum Flexibility**: Custom authorization logic per table/operation
- **Clean Architecture**: Separation of authentication (framework) and authorization (adapter)
- **Row-Level Security**: Can check record ownership and relationships

## Security Example

```typescript
// Framework handles authentication
app.use('/api', passport.authenticate('jwt', { session: false }));

// Adapter handles authorization via hooks
const drizzleApiRouter = createDrizzleRestAdapter({
  db, schema,
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          const { user } = context.req; // From framework auth
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

## Security Benefits

- **Default Secure**: No operations allowed until explicitly configured
- **Granular Control**: Per-table, per-operation, per-record authorization
- **Data Protection**: Sensitive field filtering in `afterOperation`
- **Audit Trail**: All operations can be logged and monitored
- **Type Safety**: Full TypeScript support for security logic

## Authentication vs Authorization

### Framework Responsibilities (Authentication)
- Token validation and parsing
- User session management
- `req.user` population
- Authentication middleware

### Adapter Responsibilities (Authorization)
- Permission checking via hooks
- Row-level access control
- Data filtering and transformation
- Operation-specific business rules

This separation ensures the adapter remains framework-agnostic while providing robust security capabilities.
