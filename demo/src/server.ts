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
            db: db as any,
            schema: schema,
            // Enable OpenAPI documentation generation
            // openapi: {
            //     info: {
            //         title: 'Drizzle REST Adapter Demo API',
            //         version: '1.0.0',
            //     }
            // }
        });

        // Mount the API routes
        app.use('/api/v1', apiRouter);

        app.listen(Number(PORT), '0.0.0.0', () => {
            console.log('🎉 Server started successfully!');
            console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
            console.log(`📚 API Documentation: http://0.0.0.0:${PORT}/api/v1/openapi.json`);
            console.log(`🔍 Health Check: http://0.0.0.0:${PORT}/health`);
            console.log('');
            console.log('🚀 Try these example requests:');
            console.log(`   curl http://0.0.0.0:${PORT}/api/v1/posts?published=1&_sort=-createdAt&_page=1&_per_page=3`);
            console.log(`   curl http://0.0.0.0:${PORT}/api/v1/users/1?_embed=posts`);
            console.log(`   curl http://0.0.0.0:${PORT}/api/v1/posts?title_like=Drizzle`);
            console.log('');
            console.log('📖 Full documentation available at the root endpoint: http://0.0.0.0:' + PORT);
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
