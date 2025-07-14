# Drizzle REST Adapter

[![npm version](https://badge.fury.io/js/drizzle-rest-adapter.svg)](https://badge.fury.io/js/drizzle-rest-adapter)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A dynamic REST API adapter for Drizzle ORM with JSON-Server compatible query syntax

Transform your Drizzle schema into a fully functional REST API with a single function call. Perfect for rapid prototyping, admin panels, and seamless migration from JSON-Server.

## ✨ Features

- 🚀 **Zero Configuration**: Generate REST endpoints from your Drizzle schema instantly
- 🔍 **JSON-Server Compatible**: Familiar query syntax for filtering, sorting, and pagination
- 📊 **Full CRUD Operations**: GET, POST, PUT, PATCH, DELETE with proper HTTP semantics
- 🔒 **Type Safety**: Full TypeScript support with Zod validation
- 🎯 **Production Ready**: Comprehensive error handling and HTTP status codes
- 🔗 **Relationship Support**: Basic embedding with `_embed` parameter
- ⚙️ **Configurable**: Disable endpoints per table, add custom hooks
- 🗄️ **Multi-Database**: PostgreSQL, MySQL, SQLite support via Drizzle

## 📦 Installation

```bash
npm install drizzle-rest-adapter
# or
yarn add drizzle-rest-adapter
# or
pnpm add drizzle-rest-adapter
```

## 🚀 Quick Start

```typescript
import express from 'express';
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';
import { db } from './db/connection'; // Your Drizzle instance
import * as schema from './db/schema'; // Your Drizzle schema

const app = express();
app.use(express.json());

// Create the REST API adapter
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
});

// Mount the generated API
app.use('/api/v1', apiRouter);

app.listen(3000, () => {
  console.log('REST API running on http://localhost:3000/api/v1');
});
```

That's it! Your API is now available with full CRUD operations for all tables in your schema.

## 📖 API Usage

### Basic CRUD Operations

```bash
# Get all users
GET /api/v1/users

# Get user by ID
GET /api/v1/users/123

# Create new user
POST /api/v1/users
Content-Type: application/json
{ "name": "John Doe", "email": "john@example.com" }

# Update user (partial)
PATCH /api/v1/users/123
Content-Type: application/json
{ "name": "Jane Doe" }

# Replace user (complete)
PUT /api/v1/users/123
Content-Type: application/json
{ "name": "Jane Doe", "email": "jane@example.com" }

# Delete user
DELETE /api/v1/users/123
```

### Filtering

```bash
# Direct equality
GET /api/v1/users?status=active

# Range filters
GET /api/v1/users?age_gte=18&age_lte=65

# String search (substring)
GET /api/v1/users?name_like=John

# Negation
GET /api/v1/users?status_ne=inactive

# Array membership (multiple IDs)
GET /api/v1/users?id=1&id=2&id=3
```

### Pagination

```bash
# Page-based pagination
GET /api/v1/users?_page=2&_per_page=25

# Range-based pagination
GET /api/v1/users?_start=10&_end=20
GET /api/v1/users?_start=10&_limit=10
```

### Sorting

```bash
# Single field ascending
GET /api/v1/users?_sort=name

# Single field descending
GET /api/v1/users?_sort=-created_at

# Multiple fields
GET /api/v1/users?_sort=name,-created_at,email
```

### Relationships

```bash
# Embed related data
GET /api/v1/posts?_embed=author
GET /api/v1/posts?_embed=author,comments
```

## 🛠️ Configuration

### Table-Specific Options

```typescript
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  tableOptions: {
    users: {
      // Disable specific endpoints
      disabledEndpoints: ['DELETE']
    },
    admin_logs: {
      // Make table read-only
      disabledEndpoints: ['POST', 'PUT', 'PATCH', 'DELETE']
    }
  }
});
```

### Advanced Configuration (Coming Soon)

```typescript
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  tableOptions: {
    users: {
      hooks: {
        beforeOperation: async (context) => {
          // Authentication, logging, etc.
          if (context.operation === 'DELETE' && !context.user?.isAdmin) {
            throw new Error('Unauthorized');
          }
        },
        afterOperation: async (context, result) => {
          // Transform response, logging, etc.
          return result;
        }
      }
    }
  }
});
```

## 🎯 JSON-Server Migration

Migrating from JSON-Server? The query syntax is 100% compatible:

```bash
# JSON-Server syntax → Works identically
GET /posts?_page=1&_limit=10&_sort=created_at&_order=desc
GET /posts?title_like=hello&status=published
GET /posts?id=1&id=2&id=3
GET /posts?_embed=author&_embed=comments
```

## 🗄️ Database Support

Works with all Drizzle-supported databases:

- ✅ **PostgreSQL** (recommended)
- ✅ **MySQL**
- ✅ **SQLite**
- ✅ **PlanetScale**
- ✅ **Neon**
- ✅ **And more...**

## 🔍 Query Operators Reference

| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `?status=active` | Direct equality |
| `_gte` | `?age_gte=18` | Greater than or equal |
| `_lte` | `?age_lte=65` | Less than or equal |
| `_ne` | `?status_ne=inactive` | Not equal |
| `_like` | `?name_like=John` | Substring search |
| Array | `?id=1&id=2&id=3` | Multiple values (OR) |

## 📊 Response Format

### Successful Responses

```typescript
// GET /users (200 OK)
[
  { "id": 1, "name": "John", "email": "john@example.com" },
  { "id": 2, "name": "Jane", "email": "jane@example.com" }
]

// POST /users (201 Created)
{ "id": 3, "name": "Bob", "email": "bob@example.com" }

// PATCH /users/1 (200 OK)
{ "id": 1, "name": "John Updated", "email": "john@example.com" }

// DELETE /users/1 (204 No Content)
// Empty response body
```

### Error Responses

```typescript
// 400 Bad Request (Validation Error)
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}

// 404 Not Found
{
  "error": "Resource not found",
  "message": "User with id 999 not found"
}
```

## 🧪 Example Schema

```typescript
// schema.ts
import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  age: integer('age'),
  status: text('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  author_id: integer('author_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});
```

This automatically generates:
- `GET/POST /users` and `GET/PATCH/DELETE /users/:id`
- `GET/POST /posts` and `GET/PATCH/DELETE /posts/:id`
- Full filtering, sorting, pagination for both tables
- Relationship embedding with `?_embed=author`

## 🚀 Performance

The adapter is optimized for production use:

- ✅ Efficient query generation (no N+1 problems)
- ✅ Schema introspection caching
- ✅ Minimal overhead over raw Drizzle queries
- ✅ Connection pooling support
- ✅ Proper database indexing recommendations

## 🛣️ Roadmap

- [ ] **v0.2.0**: Hook system for authentication & custom logic
- [ ] **v0.3.0**: Advanced relationship queries & deep embedding
- [ ] **v0.4.0**: Query result caching & performance optimizations
- [ ] **v0.5.0**: Full-text search & aggregation queries
- [ ] **v1.0.0**: Stable API with complete documentation

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/yourusername/drizzle-rest-adapter.git
cd drizzle-rest-adapter
npm install
npm run dev
```

### Running Tests

```bash
npm test          # Run all tests
npm run test:watch # Watch mode
npm run lint      # Lint code
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Drizzle ORM](https://orm.drizzle.team/) for the excellent database toolkit
- [JSON-Server](https://github.com/typicode/json-server) for the API design inspiration
- The TypeScript and Express.js communities

---

**Made with ❤️ for the Drizzle community**

*Transform your database schema into a REST API in seconds.*
