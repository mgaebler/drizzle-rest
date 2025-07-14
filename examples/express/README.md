# Drizzle REST Adapter Demo

This is a comprehensive demo project showcasing the **drizzle-rest-adapter** package, which automatically generates REST API endpoints from Drizzle ORM schemas with JSON-Server compatible syntax.

## 🎯 What This Demo Shows

This demo implements a **blog API** with the following features:

- ✅ **Full CRUD operations** for all entities
- ✅ **JSON-Server compatible query syntax**
- ✅ **Advanced filtering, sorting, and pagination**
- ✅ **Relationship embedding** with `_embed` parameter
- ✅ **Type-safe operations** with Zod validation
- ✅ **OpenAPI documentation** generation
- ✅ **Production-ready error handling**

## 📊 Database Schema

The demo uses a realistic blog schema with:

- **Users** - Blog authors and commenters
- **Posts** - Blog articles with rich content
- **Comments** - Nested commenting system
- **Categories** - Post categorization
- **Tags** - Post tagging system
- **Junction tables** - Many-to-many relationships

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate database schema:**
   ```bash
   npm run db:generate
   ```

3. **Start the development server:**
   ```bash
   npm run dev
The API will be available at `http://localhost:3000`

## 📖 API Usage Examples

### Basic CRUD Operations

```bash
# Get all posts
curl http://localhost:3000/api/v1/posts

# Get a specific post
curl http://localhost:3000/api/v1/posts/1

# Create a new post
curl -X POST http://localhost:3000/api/v1/posts \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "My New Post",
    "content": "This is the content...",
    "slug": "my-new-post",
    "published": 1,
    "authorId": 1
  }'

# Update a post
curl -X PATCH http://localhost:3000/api/v1/posts/1 \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Updated Title"}'

# Delete a post
curl -X DELETE http://localhost:3000/api/v1/posts/1
```

### Advanced Filtering

```bash
# Get only published posts
curl "http://localhost:3000/api/v1/posts?published=1"

# Search posts by title (substring match)
curl "http://localhost:3000/api/v1/posts?title_like=TypeScript"

# Date range filtering
curl "http://localhost:3000/api/v1/posts?createdAt_gte=2024-01-01&createdAt_lte=2024-12-31"

# Multiple filters
curl "http://localhost:3000/api/v1/posts?published=1&authorId=1"
```

### Sorting & Pagination

```bash
# Sort by creation date (newest first)
curl "http://localhost:3000/api/v1/posts?_sort=-createdAt"

# Sort by multiple fields
curl "http://localhost:3000/api/v1/users?_sort=name,email"

# Pagination
curl "http://localhost:3000/api/v1/posts?_page=1&_per_page=5"

# Combined sorting and pagination
curl "http://localhost:3000/api/v1/posts?_sort=-createdAt&_page=1&_per_page=10"
```

### Relationship Embedding

```bash
# Get post with author information
curl "http://localhost:3000/api/v1/posts/1?_embed=author"

# Get post with author and comments
curl "http://localhost:3000/api/v1/posts/1?_embed=author,comments"

# Get user with all their posts
curl "http://localhost:3000/api/v1/users/1?_embed=posts"

# Get posts with categories and tags
curl "http://localhost:3000/api/v1/posts?_embed=categories,tags"
```

### Complex Queries

```bash
# Published posts by specific author, sorted by date, with pagination
curl "http://localhost:3000/api/v1/posts?published=1&authorId=1&_sort=-createdAt&_page=1&_per_page=5"

# Users who have commented, with their comments embedded
curl "http://localhost:3000/api/v1/users?_embed=comments"

# Recent posts with full relationship data
curl "http://localhost:3000/api/v1/posts?_sort=-createdAt&_per_page=3&_embed=author,comments,categories,tags"
```

## 🌐 API Documentation

### Interactive Documentation

- **OpenAPI Spec**: `http://localhost:3000/api/v1/openapi.json`
- **Root Endpoint**: `http://localhost:3000/` (shows available endpoints and examples)
- **Health Check**: `http://localhost:3000/health`

### Available Resources

| Resource | Endpoint | Description |
|----------|----------|-------------|
| Users | `/api/v1/users` | Blog authors and commenters |
| Posts | `/api/v1/posts` | Blog articles |
| Comments | `/api/v1/comments` | Post comments (supports nesting) |
| Categories | `/api/v1/categories` | Post categories |
| Tags | `/api/v1/tags` | Post tags |
| Post Categories | `/api/v1/post-categories` | Post-category relationships |
| Post Tags | `/api/v1/post-tags` | Post-tag relationships |

### Supported Operations

All resources support:
- **GET** `/resource` - List all items
- **GET** `/resource/:id` - Get specific item
- **POST** `/resource` - Create new item
- **PUT** `/resource/:id` - Replace item completely
- **PATCH** `/resource/:id` - Update item partially
- **DELETE** `/resource/:id` - Delete item

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `field=value` | Exact match filter | `published=1` |
| `field_like=value` | Substring match | `title_like=React` |
| `field_gte=value` | Greater than or equal | `createdAt_gte=2024-01-01` |
| `field_lte=value` | Less than or equal | `createdAt_lte=2024-12-31` |
| `field_ne=value` | Not equal | `status_ne=draft` |
| `_sort=field` | Sort ascending | `_sort=createdAt` |
| `_sort=-field` | Sort descending | `_sort=-createdAt` |
| `_page=number` | Page number (1-based) | `_page=2` |
| `_per_page=number` | Items per page | `_per_page=10` |
| `_embed=relation` | Include related data | `_embed=author,comments` |

## 🛠️ Development

### Project Structure

```
demo/
├── src/
│   ├── db/
│   │   ├── connection.ts    # Database connection
│   │   ├── schema.ts        # Drizzle schema definition
│   │   └── seed.ts          # Database seeding
│   └── server.ts            # Express server setup
├── drizzle/                 # Generated migrations
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm start               # Start production server

# Database
npm run db:generate     # Generate migrations
npm run db:migrate      # Run migrations
npm run db:studio       # Open Drizzle Studio
npm run db:seed         # Seed database manually
```

### Database

This demo uses **PGlite** (in-memory PostgreSQL) for simplicity. In production, you would:

1. **Use a real PostgreSQL database**
2. **Configure connection via environment variables**
3. **Set up proper migrations workflow**
4. **Implement backup strategies**

Example production connection:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
```

## 🔧 Configuration

The `createDrizzleRestAdapter` function accepts various configuration options:

```typescript
const apiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
  config: {
    // Disable specific operations
    disabledOperations: {
      users: ['DELETE'],     // Prevent user deletion
      posts: ['PUT'],        // Only allow PATCH for posts
    },

    // Pagination settings
    pagination: {
      defaultLimit: 10,
      maxLimit: 100,
    },

    // Custom route prefix
    routePrefix: '',
  },

  // OpenAPI documentation
  openapi: {
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'API description...'
    }
  }
});
```

## 🚀 Production Considerations

For production deployment, consider:

### Security
- Add authentication/authorization middleware
- Implement rate limiting
- Use HTTPS
- Validate and sanitize inputs
- Set up CORS properly

### Performance
- Add database connection pooling
- Implement caching (Redis)
- Set up database read replicas
- Use CDN for static assets
- Monitor and optimize slow queries

### Monitoring
- Add logging (Winston, Pino)
- Set up health checks
- Monitor API metrics
- Track error rates
- Set up alerts

### Deployment
```bash
# Example Docker deployment
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## 📚 Learn More

- **Main Package**: [drizzle-rest-adapter](https://github.com/mgaebler/drizzle-rest-adapter)
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **JSON-Server**: [https://github.com/typicode/json-server](https://github.com/typicode/json-server)

## 📄 License

MIT - see LICENSE file for details.
