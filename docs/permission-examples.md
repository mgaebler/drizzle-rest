# Permission-Based Authorization Examples

This document demonstrates how to implement permission-based authorization using the pattern you suggested:

```javascript
const permissionList = [
    "users:read", "users:write", "users:delete", "users:create", "users:update",
    "comments:read", "comments:write", "comments:delete", "comments:create", "comments:update",
    "posts:read", "posts:write", "posts:delete", "posts:create", "posts:update"
];
```

## Key Concepts

### Permission Format
Permissions follow the format: `"resource:action"`
- **Resource**: The table/entity name (e.g., `users`, `posts`, `comments`)
- **Action**: The operation type (`read`, `write`, `delete`, `create`, `update`)

### Example Permission Sets

```javascript
// Regular user permissions
const userPermissions = [
    "users:read", "users:update",
    "comments:read", "comments:create", "comments:update",
    "posts:read"
];

// Editor permissions
const editorPermissions = [
    "users:read", "users:update",
    "comments:read", "comments:create", "comments:update", "comments:delete",
    "posts:read", "posts:create", "posts:update", "posts:write",
    "categories:read"
];

// Admin permissions (full access)
const adminPermissions = [
    "users:read", "users:write", "users:delete", "users:create", "users:update",
    "comments:read", "comments:write", "comments:delete", "comments:create", "comments:update",
    "posts:read", "posts:write", "posts:delete", "posts:create", "posts:update",
    // ... all other resources
];
```

## Implementation in Hooks

### Basic Permission Check Hook

```javascript
const permissionHook = async (context) => {
    const requiredPermission = `${context.table}:${getActionFromOperation(context.operation)}`;

    if (!context.req.user?.permissions?.includes(requiredPermission)) {
        throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
    }
};
```

### Operation to Action Mapping

```javascript
const getActionFromOperation = (operation) => {
    const actionMap = {
        'CREATE': 'create',
        'GET_ONE': 'read',
        'GET_MANY': 'read',
        'UPDATE': 'update',
        'REPLACE': 'write',
        'DELETE': 'delete'
    };
    return actionMap[operation];
};
```

## Usage Examples

### 1. Simple Permission Check
```javascript
{
    users: {
        hooks: {
            beforeOperation: async (context) => {
                const requiredPermission = `${context.table}:${getActionFromOperation(context.operation)}`;
                if (!hasPermission(context.req.user, requiredPermission)) {
                    throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                }
            }
        }
    }
}
```

### 2. Combined Permission Check and Auto-Setting Fields
```javascript
{
    posts: {
        hooks: {
            beforeOperation: async (context) => {
                // Check permissions first
                const requiredPermission = `${context.table}:${getActionFromOperation(context.operation)}`;
                if (!hasPermission(context.req.user, requiredPermission)) {
                    throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                }

                // Auto-set author for CREATE operations
                if (context.operation === 'CREATE') {
                    context.record.authorId = context.req.user.id;
                    context.record.createdAt = new Date();
                }
            }
        }
    }
}
```

### 3. Role-Based with Permission Fallback
```javascript
{
    users: {
        hooks: {
            beforeOperation: async (context) => {
                // Allow admins to bypass permission checks
                if (context.req.user?.role === 'admin') {
                    return;
                }

                // Check specific permissions for non-admin users
                const requiredPermission = `${context.table}:${getActionFromOperation(context.operation)}`;
                if (!hasPermission(context.req.user, requiredPermission)) {
                    throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                }
            }
        }
    }
}
```

### 4. Data Filtering Based on Permissions
```javascript
{
    users: {
        hooks: {
            afterOperation: async (context, result) => {
                // Filter sensitive data for non-admin users
                if (context.req.user?.role !== 'admin') {
                    // Remove sensitive fields if user doesn't have admin permissions
                    const { phone, email, ...filteredResult } = result;
                    return filteredResult;
                }
                return result;
            }
        }
    }
}
```

## Benefits of This Approach

1. **Granular Control**: Fine-grained permissions per resource and action
2. **Scalable**: Easy to add new resources and actions
3. **Clear**: Readable permission strings that are self-documenting
4. **Flexible**: Can combine with role-based permissions when needed
5. **Auditable**: Easy to track what permissions users have
6. **Consistent**: Same pattern across all resources

## Test Coverage

The implementation includes comprehensive tests covering:
- ✅ Users with correct permissions can perform operations
- ✅ Users without permissions are blocked with clear error messages
- ✅ Admin users with full permissions can perform any operation
- ✅ Editor users with limited permissions work correctly
- ✅ Granular permission control for specific resources
- ✅ Combined permission checks with auto-setting fields
- ✅ Error handling for various scenarios
