# Drizzle REST Adapter

*Transform your database schema into a REST API in seconds.*

[![CI](https://github.com/mgaebler/drizzle-rest/actions/workflows/ci.yml/badge.svg)](https://github.com/mgaebler/drizzle-rest/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-red.svg)](https://github.com/mgaebler/drizzle-rest-adapter)
[![Version: Pre-release](https://img.shields.io/badge/Version-v0.1.0--alpha-orange.svg)](https://github.com/mgaebler/drizzle-rest-adapter)

> A dynamic REST API adapter for Drizzle ORM with JSON-Server compatible query syntax

⚠️ **Alpha Version**: This project is in active development. APIs may change and features are still being finalized. Use in production at your own risk.

Transform your Drizzle schema into a fully functional REST API with a single function call. Perfect for rapid prototyping, admin panels, and seamless migration from JSON-Server.

## ✨ Features

- 🚀 **Zero Configuration**: Generate REST endpoints from your Drizzle schema instantly
- 🔍 **JSON-Server Compatible**: Familiar query syntax for filtering, sorting, and pagination
- 🗄️ **PostgreSQL Support**: Full PostgreSQL database support
- 📝 **Comprehensive Logging**: Built-in Pino logging with request tracing and debug modes

## 📦 Installation

> **Alpha Release**: This package is currently in alpha development and not yet published to npm. APIs may change between versions.

For now, you can install it directly from the GitHub repository:

```bash
# Install from GitHub (latest alpha)
npm install git+https://github.com/mgaebler/drizzle-rest-adapter.git

# Or clone and install locally for development
git clone https://github.com/mgaebler/drizzle-rest-adapter.git
cd drizzle-rest-adapter
npm install
npm run build
```

Once stable, it will be published to npm as:
```bash
npm install drizzle-rest-adapter
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
```

### Relationships

```bash
# Embed related data
GET /api/v1/posts?_embed=author
GET /api/v1/posts?_embed=author,comments
```

## 🎯 JSON-Server Migration

Migrating from JSON-Server? The query syntax is 100% compatible:

## 🗄️ Database Support

Currently supports PostgreSQL databases:

- ✅ **PostgreSQL** (PGlite and standard PostgreSQL)


## 🤝 Contributing

We welcome contributions! This is an alpha project, so expect rapid changes and improvements.

> **Alpha Contributors Welcome**: Since this is an alpha release, your feedback and contributions are especially valuable in shaping the final API.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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
