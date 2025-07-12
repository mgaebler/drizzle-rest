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
      * Additionally, nested routes are created for defined relations: `GET /<table-name>/:id/<relation-name>`

-----

## 3. API Query Language (JSON-Server Dialect)

To enable seamless migration from JSON-Server and maintain the familiar syntax, the adapter fully implements the **JSON-Server dialect** based on [JSON-Server v1.0.0-beta.3](https://github.com/typicode/json-server/releases/tag/v1.0.0-beta.3).

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

### Nested and Array Fields

Advanced field access is supported:

* **Nested objects**: `?user.name=John&user.age_gte=18`
* **Array elements**: `?tags[0]=javascript`
* **Operators on nested**: `?metadata.score_gt=100`

### HTTP Methods

All standard REST methods are supported:

* `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
* **PUT**: Complete resource replacement
* **PATCH**: Partial resource update

### Embed

Relational data embedding:

* **Syntax**: `?_embed=<related_table>`
* **Example**: `GET /posts?_embed=comments`

### Advanced Deletion

Cascading deletion with dependencies:

* **Syntax**: `DELETE /<table>/:id?_dependent=<related_table>`
* **Example**: `DELETE /posts/1?_dependent=comments`

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
   * Allows disabling endpoints or adding hooks.
   */
  tableOptions?: {
    [tableName: string]: {
      disabledEndpoints?: Array<'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'DELETE'>;

      // Hooks for custom logic (e.g., permission checks)
      hooks?: {
        beforeOperation?: (context: HookContext) => Promise<void>;
        afterOperation?: (context: HookContext, result: any) => Promise<any>;
      }
    }
  };
}
```

-----

## 6. Implementation Strategy

The implementation is carried out in several sequential phases to ensure a stable and maintainable codebase.

### Phase 1: Basics and Schema Introspection

**Goal**: Analyze Drizzle schema and extract metadata

```typescript
// Core module: schema-inspector.ts
export class SchemaInspector {
  constructor(private schema: Record<string, any>) {}

  /**
   * Extracts all tables from the schema
   */
  extractTables(): TableMetadata[] {
    return Object.entries(this.schema)
      .filter(([_, value]) => this.isTable(value))
      .map(([name, table]) => ({
        name,
        tableName: table[Table.Symbol.Name],
        columns: this.extractColumns(table),
        primaryKey: this.extractPrimaryKey(table),
        relations: this.extractRelations(name)
      }));
  }

  private extractColumns(table: DrizzleTable): ColumnMetadata[] {
    // Access Drizzle internal metadata
    // table[Table.Symbol.Columns] or similar
  }
}
```

**Deliverables Phase 1**:
- Schema introspection works for all Drizzle table types
- Metadata extraction for columns, primary keys, data types
- Basic tests for different schema variants

### Phase 2: Query Builder and Filter Engine

**Goal**: Translate JSON-Server compatible query parameters into Drizzle queries

```typescript
// Core module: query-builder.ts
export class QueryBuilder {
  constructor(private table: DrizzleTable) {}

  /**
   * Builds a Drizzle query from JSON-Server query parameters
   */
  buildSelectQuery(params: QueryParams): SelectQueryBuilder {
    let query = this.db.select().from(this.table);

    // Apply filters
    if (params.filters) {
      query = this.applyFilters(query, params.filters);
    }

    // Apply sorting
    if (params._sort) {
      query = this.applySort(query, params._sort, params._order);
    }

    // Apply pagination
    if (params._page || params._limit) {
      query = this.applyPagination(query, params._page, params._limit);
    }

    return query;
  }

  private applyFilters(query: SelectQueryBuilder, filters: Record<string, any>): SelectQueryBuilder {
    return Object.entries(filters).reduce((q, [key, value]) => {
      // Parse JSON-Server filter syntax
      if (key.endsWith('_gte')) {
        const column = key.replace('_gte', '');
        return q.where(gte(this.table[column], value));
      }

      if (key.endsWith('_lte')) {
        const column = key.replace('_lte', '');
        return q.where(lte(this.table[column], value));
      }

      if (key.endsWith('_like')) {
        const column = key.replace('_like', '');
        return q.where(like(this.table[column], `%${value}%`));
      }

      if (key.endsWith('_ne')) {
        const column = key.replace('_ne', '');
        return q.where(ne(this.table[column], value));
      }

      // Direct equality (Standard JSON-Server)
      if (!key.startsWith('_')) {
        if (Array.isArray(value)) {
          return q.where(inArray(this.table[key], value));
        }
        return q.where(eq(this.table[key], value));
      }

      return q;
    }, query);
  }

  private applySort(query: SelectQueryBuilder, sortField: string, order: 'asc' | 'desc' = 'asc'): SelectQueryBuilder {
    if (order === 'desc') {
      return query.orderBy(desc(this.table[sortField]));
    }
    return query.orderBy(asc(this.table[sortField]));
  }

  private applyPagination(query: SelectQueryBuilder, page: number = 1, limit: number = 10): SelectQueryBuilder {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }
}
```

**Deliverables Phase 2**:
- Complete implementation of all JSON-Server filter operators
- Robust query parameter parsing for JSON-Server syntax
- Comprehensive tests for all filter combinations
- Performance-optimized query generation
- Support for `_embed` and `_expand` parameters

### Phase 3: HTTP Handlers and Middleware

**Goal**: Request/Response handling for all CRUD operations

```typescript
// Core module: handlers.ts
export class CrudHandlers {
  constructor(
    private db: DrizzleClient,
    private table: DrizzleTable,
    private validator: ZodValidator
  ) {}

  /**
   * GET /table - List with filtering, sorting, pagination
   */
  async getMany(req: Request, res: Response): Promise<void> {
    try {
      const params = this.parseQueryParams(req.query);
      const queryBuilder = new QueryBuilder(this.table);
      const query = queryBuilder.buildSelectQuery(params);

      const [results, totalCount] = await Promise.all([
        query.execute(),
        this.getTotalCount(params.filters)
      ]);

      res.set('X-Total-Count', String(totalCount));
      res.json(results);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * POST /table - Create a new record
   */
  async createOne(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = this.validator.validateInsert(req.body);
      const result = await this.db.insert(this.table).values(validatedData).returning();

      res.status(201).json(result[0]);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  // ... other handlers for getOne, updateOne, deleteOne
}
```

**Deliverables Phase 3**:
- Complete CRUD handler implementation
- Robust error handling and HTTP status codes
- Validation with dynamically generated Zod schemas
- Request/Response logging and debugging support

### Phase 4: Router Assembly and Middleware Integration

**Goal**: Dynamic router creation and framework integration

```typescript
// Main module: adapter.ts
export function createDrizzleRestAdapter(options: DrizzleRestAdapterOptions): Router {
  const inspector = new SchemaInspector(options.schema);
  const tables = inspector.extractTables();
  const router = express.Router();

  // Create and route handlers for each table
  tables.forEach(tableMetadata => {
    const handlers = new CrudHandlers(
      options.db,
      options.schema[tableMetadata.name],
      new ZodValidator(tableMetadata)
    );

    const tablePath = `/${tableMetadata.name}`;
    const tableOptions = options.tableOptions?.[tableMetadata.name];

    // Register CRUD routes (if not disabled)
    if (!tableOptions?.disabledEndpoints?.includes('GET_MANY')) {
      router.get(tablePath, handlers.getMany.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('CREATE')) {
      router.post(tablePath, handlers.createOne.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('GET_ONE')) {
      router.get(`${tablePath}/:id`, handlers.getOne.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('UPDATE')) {
      router.patch(`${tablePath}/:id`, handlers.updateOne.bind(handlers));
    }

    if (!tableOptions?.disabledEndpoints?.includes('DELETE')) {
      router.delete(`${tablePath}/:id`, handlers.deleteOne.bind(handlers));
    }

    // Relation routes for nested resources
    this.registerRelationRoutes(router, tableMetadata, handlers);
  });

  return router;
}
```

**Deliverables Phase 4**:
- Complete adapter main function
- Framework-agnostic router creation
- Configuration-based endpoint activation/deactivation
- Relation support for nested resources

### Phase 5: Advanced Features and Optimizations

**Goal**: Hooks, performance optimizations, and advanced functionalities

```typescript
// Advanced Features
export class AdvancedHandlers extends CrudHandlers {
  async getMany(req: Request, res: Response): Promise<void> {
    const tableConfig = this.options.tableOptions?.[this.tableName];

    // Execute before-hook
    if (tableConfig?.hooks?.beforeOperation) {
      await tableConfig.hooks.beforeOperation({
        operation: 'GET_MANY',
        table: this.tableName,
        params: req.query,
        user: req.user // if authentication middleware is present
      });
    }

    // Execute standard operation
    const result = await super.getMany(req, res);

    // Execute after-hook
    if (tableConfig?.hooks?.afterOperation) {
      const modifiedResult = await tableConfig.hooks.afterOperation({
        operation: 'GET_MANY',
        table: this.tableName,
        result: result
      }, result);

      return modifiedResult;
    }

    return result;
  }
}
```

**Deliverables Phase 5**:
- Hook system for custom logic
- Performance optimizations (query caching, connection pooling)
- Advanced relation support (deep nesting)
- Comprehensive documentation and examples

### Phase 6: Testing and Production Readiness

**Goal**: Comprehensive tests and production optimizations

```typescript
// Test suite example
describe('DrizzleRestAdapter', () => {
  let adapter: Router;
  let testDb: DrizzleClient;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    adapter = createDrizzleRestAdapter({
      db: testDb,
      schema: testSchema
    });
  });

  describe('GET /users', () => {
    it('should return all users without filters', async () => {
      const response = await request(adapter).get('/users');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter users by status', async () => {
      const response = await request(adapter).get('/users?status=active');
      expect(response.status).toBe(200);
      expect(response.body.every(user => user.status === 'active')).toBe(true);
    });

    it('should sort users by created_at descending', async () => {
      const response = await request(adapter).get('/users?_sort=created_at&_order=desc');
      expect(response.status).toBe(200);
      expect(response.body[0].created_at).toBeGreaterThan(response.body[1].created_at);
    });

    it('should paginate users correctly', async () => {
      const response = await request(adapter).get('/users?_page=2&_limit=5');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(5);
      expect(response.headers['x-total-count']).toBeDefined();
    });

    it('should filter with range operators', async () => {
      const response = await request(adapter).get('/users?age_gte=18&age_lte=65');
      expect(response.status).toBe(200);
      expect(response.body.every(user => user.age >= 18 && user.age <= 65)).toBe(true);
    });
  });

  // ... more tests for all CRUD operations and edge cases
});
```

**Deliverables Phase 6**:
- Complete test suite with >90% coverage
- Performance benchmarks and optimizations
- Production-ready error handling
- Comprehensive documentation and migration guides

### Implementation Order

1.  **Weeks 1-2**: Phase 1 (Schema Introspection)
2.  **Weeks 3-4**: Phase 2 (Query Builder)
3.  **Weeks 5-6**: Phase 3 (HTTP Handlers)
4.  **Weeks 7-8**: Phase 4 (Router Assembly)
5.  **Weeks 9-10**: Phase 5 (Advanced Features)
6.  **Weeks 11-12**: Phase 6 (Testing & Production Readiness)

This strategy allows for a functional version to be available after Phase 4, while advanced features can be added in later phases.
