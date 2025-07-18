# Technical Concept: Drizzle REST Adapter (Revised)

The core idea is a single function, `createDrizzleRestAdapter`, which takes a configuration object and returns a ready-to-use middleware compatible with frameworks like Express or Fastify. The middleware generates a REST API at runtime based on a Drizzle schema.

-----

## 1. Usage and Signature

This is how a developer would use the adapter. This is the central goal.

```typescript
// In your server.ts
import express from 'express';
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';
import { db } from './db/connection'; // Your Drizzle instance
import * as schema from './db/schema'; // Your imported Drizzle schema

const app = express();
app.use(express.json());

// Create and configure the adapter
const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  // Optional configurations
  tableOptions: {
    users: {
      // Disable deleting users
      disabledEndpoints: ['DELETE']
    }
  }
});

// Mount the generated API under a prefix
// A client could now query, for example, /api/v1/users?status=active&_sort=created_at&_order=desc
app.use('/api/v1', drizzleApiRouter);

app.listen(3000, () => {
  console.log('Server with Drizzle REST Adapter running on port 3000');
});
```

-----

## 2. How the Adapter Works

The `createDrizzleRestAdapter` function performs the following steps at runtime (when the server starts):

  * **Schema Introspection**: The adapter analyzes the provided `schema` object to identify all table and relation definitions. It inspects Drizzle's internal metadata to access table names, columns, and primary keys.

  * **Dynamic Zod Schema Creation**: Internally and in memory, the adapter uses the `createInsertSchema` function from `drizzle-zod` for each table to automatically create validation schemas for `POST` and `PATCH` requests.

  * **Dynamic Router Creation**: The adapter creates a new router instance (e.g., `express.Router()`). For each table found in the schema, the following endpoints are programmatically bound to the router:

      * `GET /<table-name>`: Handler for `getMany`
      * `POST /<table-name>`: Handler for `createOne`
      * `GET /<table-name>/:id`: Handler for `getOne`
      * `PATCH /<table-name>/:id`: Handler for `updateOne`
      * `DELETE /<table-name>/:id`: Handler for `deleteOne`

-----

## 3. API Query Language (JSON-Server Dialect)

To enable seamless migration from JSON-Server and maintain the familiar syntax, the adapter implements the **JSON-Server dialect** based on [JSON-Server v1.0.0-beta.3](https://github.com/typicode/json-server/releases/tag/v1.0.0-beta.3), with adaptations for relational database usage.

### Filtering

Filters are passed as direct query parameters. Multiple parameters are linked with **AND** by default.

  * **Example**: `GET /users?status=active&company_id=1`

The following operators are supported:

  * **Direct Equality**: `?status=active`
  * **Range Filters**: `?age_gte=18&age_lte=65`
  * **String Search**: `?name_like=John` (substring search)
  * **Negation**: `?status_ne=inactive`
  * **Array Membership**: `?id=1&id=2&id=3` (multiple IDs)

### Pagination

Pagination supports both page-based and range-based approaches:

* **Page-based**: `?_page=1&_per_page=25`
* **Range-based**: `?_start=10&_end=20` or `?_start=10&_limit=10`
* **Default**: `_per_page=10` if not specified

### Sorting

Sorting supports multiple fields with comma separation:

* **Syntax**: `?_sort=field1,field2,-field3`
* **Descending**: Use `-` prefix (e.g., `-created_at`)
* **Example**: `GET /users?_sort=name,-created_at`

### HTTP Methods

All standard REST methods are supported:

* `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
* **PUT**: Complete resource replacement
* **PATCH**: Partial resource update

### Design Decision: Nested and Array Fields

**Status**: **Not Implemented**

While the original JSON-Server specification includes nested and array field access (`?user.name=John`, `?tags[0]=javascript`), this feature has been **intentionally excluded** from the Drizzle REST Adapter for the following reasons:

#### Implementation Complexity vs Value

* Nested field support would require complex PostgreSQL JSON operators
* Would only be useful for schemas with JSON/JSONB columns (edge case)
* Adds significant complexity to type safety and query generation
* Alternative solutions (`_embed` for relationships) provide better relational patterns

#### Alternative: Use Embed for Relationships

Instead of nested field access, use the `_embed` parameter for relational data:

```bash
GET /posts?_embed=author
GET /authors?name=John  # Get author ID first
GET /posts?authorId=123 # Then filter posts
```

This design decision keeps the adapter focused on relational database best practices while maintaining JSON-Server compatibility for the most commonly used features.

## 🎉 **IMPLEMENTATION STATUS (July 12, 2025): 100% COMPLETE**

The JSON-Server dialect specification outlined above has been **FULLY IMPLEMENTED** in the Drizzle REST Adapter:

### ✅ **COMPLETED FEATURES:**

- **✅ All Filtering Operators**: Direct equality, range filters (`_gte`, `_lte`), string search (`_like`), negation (`_ne`), and array membership
- **✅ Complete Pagination**: Both page-based (`_page`, `_per_page`) and range-based (`_start`, `_end`, `_limit`) pagination
- **✅ Multi-field Sorting**: Full JSON-Server syntax support (`_sort=field1,field2,-field3`) with descending prefix
- **✅ All HTTP Methods**: GET, POST, PUT, PATCH, DELETE with proper REST semantics
- **✅ Basic Embed Support**: `_embed` parameter for relationship loading with comma-separated and multiple parameter support

### ❌ **INTENTIONALLY EXCLUDED:**

- **❌ Nested Field Access**: `?user.name=John` - Excluded by design for relational database best practices
- **❌ Array Element Access**: `?tags[0]=javascript` - Excluded by design for implementation complexity vs value

### 🏗️ **ARCHITECTURE IMPLEMENTED:**

- **✅ Schema Introspection**: Complete table, column, and relationship metadata extraction
- **✅ Dynamic Query Building**: Runtime translation of JSON-Server parameters to Drizzle queries
- **✅ Dynamic Router Creation**: Automatic REST endpoint generation for all tables
- **✅ Configuration Support**: Table-specific endpoint disabling and options
- **✅ Error Handling**: Comprehensive error responses with proper HTTP status codes
- **✅ Type Safety**: Full TypeScript support with Zod validation schemas

The adapter is **production-ready** for JSON-Server compatible REST APIs with relational databases.

-----

## 4. Specification of Dynamic Handlers

The generated handlers implement the following features:

  * **getMany**: Processes query parameters for **filtering**, **sorting**, and **pagination** according to the **JSON-Server dialect** and dynamically builds the Drizzle query.

  * **getOne**: Processes the `:id` parameter and returns a `404` error if not found. Supports the `?select=` parameter for selecting specific columns.

  * **createOne**: Validates the body against the dynamically created Zod schema (`400` error on failure) and returns `201 Created` on success.

  * **updateOne (as PATCH)**: Validates the partial body and returns the updated object on success (`404` if not found).

  * **deleteOne**: Deletes the record and returns `204 No Content` (`404` if not found).

-----

## 5. Configuration Object

The `createDrizzleRestAdapter` function accepts a configuration object for customization.

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

  /** Security configuration */
  security?: {
    /** Maximum request body size in bytes (default: 1MB) */
    maxBodySize?: number;
    /** Enable request sanitization (default: true) */
    sanitizeInput?: boolean;
    /** Rate limiting configuration */
    rateLimit?: {
      windowMs: number;
      max: number;
    };
  };

  /** Logging configuration */
  logging?: {
    /** Logger instance or configuration */
    logger?: Logger | LoggerOptions;
    /** Request logging options */
    requestLogging?: RequestLogOptions;
  };
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

-----

## 6. Implementation Strategy

The implementation is carried out in several sequential phases to ensure a stable and maintainable codebase.

### Phase 1: Basics and Schema Introspection

**Goal**: Analyze Drizzle schema and extract metadata

**Deliverables Phase 1**:
- Schema introspection works for all Drizzle table types
- Metadata extraction for columns, primary keys, data types
- Basic tests for different schema variants

### Phase 2: Query Builder and Filter Engine

**Goal**: Translate JSON-Server compatible query parameters into Drizzle queries

**Deliverables Phase 2**:
- Complete implementation of all JSON-Server filter operators
- Robust query parameter parsing for JSON-Server syntax
- Comprehensive tests for all filter combinations
- Support for `_embed` parameters

### Phase 3: HTTP Handlers and Middleware

**Goal**: Request/Response handling for all CRUD operations

**Deliverables Phase 3**:
- Complete CRUD handler implementation
- Robust error handling and HTTP status codes
- Validation with dynamically generated Zod schemas
- Request/Response logging and debugging support

### Phase 4: Router Assembly and Middleware Integration

**Goal**: Dynamic router creation and framework integration

**Deliverables Phase 4**:
- Complete adapter main function
- Framework-agnostic router creation
- Configuration-based endpoint activation/deactivation
- Relation support for nested resources

### Phase 5: Advanced Features and Security

**Goal**: Hooks for authorization, performance optimizations, and advanced functionalities

**Deliverables Phase 5**:
- Hook system for authorization and custom logic (CRITICAL FOR SECURITY)
- Performance optimizations (query caching, connection pooling)
- Advanced relation support (deep nesting)
- Comprehensive documentation and security examples

### Phase 6: Testing and Production Readiness

**Goal**: Comprehensive tests and production optimizations

**Deliverables Phase 6**:
- Complete test suite with >90% coverage
- Performance benchmarks and optimizations
- Production-ready error handling
- Comprehensive documentation and migration guides

### Implementation Status - UPDATED (July 18, 2025)

**✅ COMPLETED PHASES:**

1.  **✅ Phases 1-4: COMPLETE** - Core JSON-Server functionality fully implemented
2.  **🚨 Phase 5: CRITICAL** - Hook system required for production security
3.  **🔄 Phase 6: IN PROGRESS** - Testing and production readiness

**Security-First Release Strategy:**

1.  **🚨 Hook System Implementation**: `beforeOperation`/`afterOperation` hooks for authorization (BLOCKING)
2.  **� Authorization Patterns**: Framework auth + hook-based access control
3.  **📋 Security Documentation**: Setup guides with authentication examples
4.  **� Security Audit**: Address npm audit vulnerabilities and input validation
5.  **🚀 Secure Alpha Release**: Only after authorization system is complete

**Current Status**: The adapter provides a **fully functional JSON-Server compatible REST API** with complete filtering, pagination, sorting, and basic embedding capabilities. **Hook-based authorization system is required before public release** to ensure secure access control in production environments.

## 7. Security Architecture

### Security Model

The Drizzle REST Adapter follows a **layered security approach**:

1. **Framework Layer**: Handles authentication (JWT, OAuth, sessions)
2. **Adapter Layer**: Handles authorization via hooks
3. **Database Layer**: Leverages Drizzle's type-safe query building

### Authorization via Hooks

**Key Finding**: During implementation, we discovered that the planned hook system is the **perfect solution for authorization**. Rather than building a separate authorization framework, hooks provide:

- **Framework Agnostic**: Works with any authentication system
- **Maximum Flexibility**: Custom authorization logic per table/operation
- **Clean Architecture**: Separation of authentication (framework) and authorization (adapter)
- **Row-Level Security**: Can check record ownership and relationships

### Security Example

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

### Security Benefits

- **Default Secure**: No operations allowed until explicitly configured
- **Granular Control**: Per-table, per-operation, per-record authorization
- **Data Protection**: Sensitive field filtering in `afterOperation`
- **Audit Trail**: All operations can be logged and monitored
- **Type Safety**: Full TypeScript support for security logic

-----

## 8. Architectural Decisions and Findings

### Hook-Based Authorization Discovery

During the security analysis phase, a **critical architectural insight** was discovered: the planned hook system (Phase 5) is the ideal solution for authorization rather than building a separate security framework.

#### The Problem
Initially, the adapter exposed all CRUD operations publicly without any access control mechanism. This created a critical security vulnerability where any user could:
- Read all data (`GET /users`, `GET /posts`)
- Create records (`POST /users`)
- Update any record (`PATCH /users/123`)
- Delete any record (`DELETE /users/123`)

#### The Solution Discovery
Rather than implementing a complex authorization configuration system, we realized the already-planned hook system provides the perfect authorization mechanism:

**Why Hooks Work Better:**
1. **Leverage Existing Architecture**: Uses the planned Phase 5 hook system
2. **Framework Agnostic**: Works with any authentication system (JWT, OAuth, sessions)
3. **Maximum Flexibility**: Custom authorization logic per table and operation
4. **Clean Separation**: Framework handles authentication, adapter handles authorization
5. **No Breaking Changes**: Builds on existing configuration patterns

#### Implementation Pattern
```typescript
// Authentication: Framework responsibility
app.use('/api', authenticationMiddleware);

// Authorization: Adapter hooks responsibility
const adapter = createDrizzleRestAdapter({
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          // Custom authorization logic using context.req.user
          if (!hasPermission(context.req.user, context.operation)) {
            throw new Error('Forbidden');
          }
        }
      }
    }
  }
});
```

#### Architectural Benefits
- **Security by Design**: Authorization becomes integral to the adapter's operation
- **Developer Experience**: Familiar hook pattern for custom logic
- **Performance**: Authorization only runs when operations are executed
- **Maintainability**: Security logic is co-located with business logic
- **Extensibility**: Same pattern works for audit logging, data validation, etc.

### Design Principle: Separation of Concerns

This discovery reinforced a key architectural principle:

**Framework Responsibilities** (Authentication):
- Token validation and parsing
- User session management
- `req.user` population
- Authentication middleware

**Adapter Responsibilities** (Authorization):
- Permission checking via hooks
- Row-level access control
- Data filtering and transformation
- Operation-specific business rules

This separation ensures the adapter remains framework-agnostic while providing robust security capabilities.
