# Technical Concept: Drizzle REST Adapter (Overview)

The core idea is a single function, `createDrizzleRestAdapter`, which takes a configuration object and returns a ready-to-use middleware that generates a REST API at runtime based on a Drizzle schema.

It should be compatible with frameworks like Express, Fastify, react-router and Next.js.

## How the Adapter Works

The `createDrizzleRestAdapter` function performs the following steps at runtime (when the server starts):

* **Schema Introspection**: The adapter analyzes the provided `schema` object to identify all table and relation definitions. It inspects Drizzle's internal metadata to access table names, columns, and primary keys.

* **Dynamic Zod Schema Creation**: Internally and in memory, the adapter uses the `createInsertSchema` function from `drizzle-zod` for each table to automatically create validation schemas for `POST` and `PATCH` requests.

* **Dynamic Router Creation**: The adapter creates a new router instance (e.g., `express.Router()`). For each table found in the schema, the following endpoints are programmatically bound to the router:

  * `GET /<table-name>`: Handler for `getMany`
  * `POST /<table-name>`: Handler for `createOne`
  * `GET /<table-name>/:id`: Handler for `getOne`
  * `PATCH /<table-name>/:id`: Handler for `updateOne`
  * `DELETE /<table-name>/:id`: Handler for `deleteOne`


## Usage Example

This is how a developer would use the adapter - this is the central goal:

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