# Drizzle REST Adapter - Demo Project

This demo project has been created to showcase the capabilities of the **drizzle-rest-adapter** package for package maintainers and potential users.

## 📋 Project Overview

### What is Drizzle REST Adapter?

The `drizzle-rest-adapter` is a powerful package that automatically generates REST API endpoints from Drizzle ORM schemas. It provides:

- **JSON-Server compatible syntax** for easy migration and familiar developer experience
- **Full CRUD operations** with proper HTTP semantics
- **Advanced querying** with filtering, sorting, pagination, and relationship embedding
- **Type safety** with TypeScript and Zod validation
- **OpenAPI documentation** generation
- **Zero configuration** setup for rapid prototyping

### Demo Features

This demo implements a complete **blog API** that demonstrates:

1. **Complex Schema Relationships**
   - One-to-many (User → Posts, Post → Comments)
   - Many-to-many (Posts ↔ Categories, Posts ↔ Tags)
   - Self-referencing (Comments → Parent Comments)

2. **Real-world Data Models**
   - Users with profiles and avatars
   - Posts with rich content, slugs, and publishing status
   - Nested comment system
   - Category and tag classification

3. **Production-ready Patterns**
   - Proper error handling
   - Health checks
   - OpenAPI documentation
   - Database migrations
   - Comprehensive seeding

## 🎯 Target Audience

This demo is designed for:

- **Package maintainers** evaluating REST API solutions
- **Developers** considering Drizzle ORM adoption
- **Teams** migrating from JSON-Server
- **API architects** designing new REST services
- **Students** learning modern API development

## 🚀 Quick Start for Maintainers

### 1. Installation & Setup

```bash
cd demo
npm install
npm run db:generate
npm run dev
```

The API will be available at `http://localhost:3000`

### 2. Test the API

```bash
# Run automated tests
./test-api.sh

# Or test manually
curl http://localhost:3000/api/v1/posts?published=1&_sort=-createdAt&_per_page=3
```

### 3. Explore Documentation

- **Interactive API**: `http://localhost:3000/`
- **OpenAPI Spec**: `http://localhost:3000/api/v1/openapi.json`
- **Health Check**: `http://localhost:3000/health`

## 📊 Key Capabilities Demonstrated

### 1. Automatic Endpoint Generation

```typescript
// Just this simple setup creates 7 complete REST resources:
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
});

app.use('/api/v1', apiRouter);
```

**Generated endpoints:**
- `/users` - User management
- `/posts` - Blog posts
- `/comments` - Comment system
- `/categories` - Post categories
- `/tags` - Post tags
- `/post-categories` - Many-to-many relationships
- `/post-tags` - Many-to-many relationships

### 2. JSON-Server Compatible Queries

```bash
# Filtering
GET /posts?published=1&authorId=2

# Text search
GET /posts?title_like=TypeScript

# Range queries
GET /posts?createdAt_gte=2024-01-01&createdAt_lte=2024-12-31

# Sorting
GET /posts?_sort=-createdAt,title

# Pagination
GET /posts?_page=2&_per_page=5

# Relationships
GET /posts/1?_embed=author,comments
```

### 3. Type Safety & Validation

All requests are automatically validated using Zod schemas derived from your Drizzle schema:

```typescript
// Automatic validation for:
✅ Required fields
✅ Data types
✅ String lengths
✅ Foreign key constraints
✅ Unique constraints
```

### 4. OpenAPI Documentation

Automatically generated OpenAPI 3.0 specification with:
- Complete endpoint documentation
- Request/response schemas
- Filter parameter documentation
- Relationship embedding docs
- Interactive testing interface

## 📁 Project Structure

```
demo/
├── src/
│   ├── db/
│   │   ├── connection.ts     # Database setup (PGlite for demo)
│   │   ├── schema.ts         # Complete blog schema with relations
│   │   └── seed.ts           # Realistic sample data
│   └── server.ts             # Express server with drizzle-rest-adapter
├── drizzle/                  # Generated migrations
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── start.sh                  # Quick start script
├── test-api.sh               # API testing script
└── README.md                 # Comprehensive documentation
```

## 🔧 Configuration Examples

### Basic Setup

```typescript
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
});
```

### Production Configuration

```typescript
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  config: {
    // Security: Disable dangerous operations
    disabledOperations: {
      users: ['DELETE'],
      posts: ['DELETE'],
    },

    // Performance: Pagination limits
    pagination: {
      defaultLimit: 20,
      maxLimit: 100,
    },
  },

  // Documentation
  openapi: {
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: 'Complete blog management API',
    },
    security: [
      { bearerAuth: [] }
    ]
  }
});
```

## 📈 Performance Characteristics

The demo showcases several performance features:

### Efficient Queries
- **Optimized joins** for relationship embedding
- **Selective column fetching** based on schema
- **Proper indexing** in database schema
- **Query result caching** opportunities

### Scalability Patterns
- **Pagination** to handle large datasets
- **Filtering** to reduce data transfer
- **Relationship embedding** to minimize round trips
- **Type-safe operations** to prevent runtime errors

## 🛡️ Production Considerations

The demo includes patterns for:

### Security
- Input validation with Zod
- SQL injection prevention (Drizzle ORM)
- Error message sanitization
- CORS configuration ready

### Monitoring
- Health check endpoints
- Structured error responses
- Request/response logging hooks
- OpenAPI spec for monitoring tools

### Deployment
- Docker-ready structure
- Environment configuration
- Database migration workflow
- Production build process

## 🔄 Migration Path from JSON-Server

For teams currently using JSON-Server:

### 1. Schema Definition
Replace your `db.json` with a Drizzle schema:

```typescript
// Old: db.json
{
  "posts": [
    { "id": 1, "title": "...", "userId": 1 }
  ],
  "users": [
    { "id": 1, "name": "..." }
  ]
}

// New: schema.ts
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  userId: integer('user_id').references(() => users.id),
});
```

### 2. API Compatibility
All your existing frontend code continues to work:

```javascript
// These requests work exactly the same:
fetch('/api/posts?_sort=-createdAt&_per_page=5')
fetch('/api/posts/1?_embed=user')
fetch('/api/users?name_like=John')
```

### 3. Enhanced Capabilities
Gain additional features:
- Real database persistence
- Type safety
- Validation
- Relationships
- Production scalability

## 🎉 Demo Highlights

### Rich Sample Data
- 4 realistic user profiles
- 5 detailed blog posts
- Nested comment threads
- Categories and tags
- Many-to-many relationships

### Complete CRUD Examples
- User management
- Post publishing workflow
- Comment moderation
- Category organization
- Tag management

### Real-world Queries
- "Get latest published posts with author info"
- "Find posts about TypeScript with comments"
- "Get user profile with all their content"
- "Search content by date range"

### API Documentation
- Interactive endpoint explorer
- Complete parameter documentation
- Response schema examples
- Relationship embedding guide

## 🏁 Next Steps for Maintainers

1. **Run the demo**: `./start.sh`
2. **Explore the API**: Try the example requests
3. **Review the code**: Check the schema and server setup
4. **Test integration**: See how it fits your stack
5. **Consider adoption**: Evaluate for your projects

This demo provides a comprehensive foundation for understanding the full capabilities of the drizzle-rest-adapter package in a realistic application context.
