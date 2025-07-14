import { migrate } from 'drizzle-orm/pglite/migrator';
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';
import express from 'express';

import { db } from '@/db/connection';
import * as schema from '@/db/schema';
import { seedDatabase } from '@/db/seed';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Welcome page with API documentation
app.get('/', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
        message: '🚀 Drizzle REST Adapter Demo',
        description: 'A blog API demonstrating drizzle-rest-adapter capabilities',
        version: '1.0.0',
        documentation: {
            openapi: `${baseUrl}/api/v1/openapi.json`,
            endpoints: `${baseUrl}/api/v1`,
        },
        examples: {
            'Get all published posts': `${baseUrl}/api/v1/posts?published=1&_sort=-createdAt&_page=1&_per_page=5`,
            'Get post with author and comments': `${baseUrl}/api/v1/posts/1?_embed=author,comments`,
            'Search posts by title': `${baseUrl}/api/v1/posts?title_like=TypeScript`,
            'Get users with their posts': `${baseUrl}/api/v1/users?_embed=posts`,
            'Get categories with post count': `${baseUrl}/api/v1/categories`,
            'Filter by date range': `${baseUrl}/api/v1/posts?createdAt_gte=2024-01-01&createdAt_lte=2024-12-31`,
        },
        features: [
            '✅ Full CRUD operations',
            '✅ JSON-Server compatible query syntax',
            '✅ Filtering, sorting, and pagination',
            '✅ Relationship embedding',
            '✅ Type-safe with Zod validation',
            '✅ OpenAPI documentation',
            '✅ Multi-table support'
        ],
        resources: {
            users: `${baseUrl}/api/v1/users`,
            posts: `${baseUrl}/api/v1/posts`,
            comments: `${baseUrl}/api/v1/comments`,
            categories: `${baseUrl}/api/v1/categories`,
            tags: `${baseUrl}/api/v1/tags`,
            postCategories: `${baseUrl}/api/v1/post-categories`,
            postTags: `${baseUrl}/api/v1/post-tags`,
        }
    });
});

async function startServer() {
    try {
        console.log('🔄 Running database migrations...');
        await migrate(db, { migrationsFolder: './drizzle' });

        console.log('🌱 Seeding database...');
        await seedDatabase();    // Create the REST API adapter
        const apiRouter = createDrizzleRestAdapter({
            db: db as any, // Type assertion to handle version compatibility
            schema: schema,
            // Enable OpenAPI documentation generation
            openapi: {
                info: {
                    title: 'Drizzle REST Adapter Demo API',
                    version: '1.0.0',
                    description: `
# Blog API Demo

This API demonstrates the capabilities of the **drizzle-rest-adapter** package, which automatically generates REST endpoints from Drizzle ORM schemas.

## Features

- **JSON-Server Compatible**: Familiar query syntax for easy adoption
- **Full CRUD**: GET, POST, PUT, PATCH, DELETE operations
- **Advanced Filtering**: Support for various filter operators
- **Sorting & Pagination**: Efficient data retrieval
- **Relationship Embedding**: Include related data in responses
- **Type Safety**: Full TypeScript support with runtime validation

## Quick Examples

### Basic Operations
- \`GET /posts\` - Get all posts
- \`GET /posts/1\` - Get specific post
- \`POST /posts\` - Create new post
- \`PATCH /posts/1\` - Update post
- \`DELETE /posts/1\` - Delete post

### Filtering
- \`GET /posts?published=1\` - Only published posts
- \`GET /posts?title_like=React\` - Posts with "React" in title
- \`GET /users?createdAt_gte=2024-01-01\` - Users created after date

### Sorting & Pagination
- \`GET /posts?_sort=-createdAt&_page=1&_per_page=5\` - Latest 5 posts
- \`GET /users?_sort=name,email\` - Sort by name, then email

### Embedding Relationships
- \`GET /posts/1?_embed=author,comments\` - Post with author and comments
- \`GET /users?_embed=posts\` - Users with their posts

## Schema Overview

This demo uses a blog schema with the following entities:
- **Users**: Blog authors and commenters
- **Posts**: Blog articles with content
- **Comments**: Post comments (supports nesting)
- **Categories**: Post categorization
- **Tags**: Post tagging system
          `,
                }
            }
        });

        // Mount the API routes
        app.use('/api/v1', apiRouter);

        // Error handling middleware
        app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
            console.error('Error:', err);
            res.status(err.status || 500).json({
                error: {
                    message: err.message || 'Internal Server Error',
                    status: err.status || 500,
                    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
                }
            });
        });

        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({
                error: {
                    message: 'Not Found',
                    status: 404,
                    path: req.originalUrl
                }
            });
        });

        app.listen(PORT, () => {
            console.log('🎉 Server started successfully!');
            console.log(`🌐 Server running on http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/v1/openapi.json`);
            console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
            console.log('');
            console.log('🚀 Try these example requests:');
            console.log(`   curl http://localhost:${PORT}/api/v1/posts?published=1&_sort=-createdAt&_page=1&_per_page=3`);
            console.log(`   curl http://localhost:${PORT}/api/v1/users/1?_embed=posts`);
            console.log(`   curl http://localhost:${PORT}/api/v1/posts?title_like=Drizzle`);
            console.log('');
            console.log('📖 Full documentation available at the root endpoint: http://localhost:' + PORT);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📤 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📤 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
