import { migrate } from 'drizzle-orm/pglite/migrator';
import { createExpressDrizzleRestAdapter } from "@drizzle-rest/express-adapter";
import express from 'express';

import { db } from '@/db/connection';
import * as schema from '@/db/schema';
import { seedDatabase } from '@/db/seed';

const app = express();
const PORT = process.env.PORT || 3000;
const host = "localhost";

// Create a logger instance for development
const useDebugLogging = false; // Set to true for detailed logging

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
            endpoints: `${baseUrl}/api/v1`,
        },
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

        await migrate(db, { migrationsFolder: './drizzle' });
        await seedDatabase();

        // Create the REST API adapter with logging enabled
        const apiRouter = createExpressDrizzleRestAdapter({
            db: db as any,
            schema: schema,
        });

        // Mount the API routes
        app.use('/api/v1', apiRouter);

        app.listen(Number(PORT), host, () => {
            console.info({
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                debugLogging: useDebugLogging
            }, '🎉 Server started successfully!');

            console.info('🌐 Server running on http://' + host + ':' + PORT);
            console.info('🔍 Health Check: http://' + host + ':' + PORT + '/health');
            console.info('');
            console.info('🚀 Try these example requests:');
            console.info(`   curl http://${host}:${PORT}/api/v1/posts?published=1&_sort=-createdAt&_page=1&_per_page=3`);
            console.info(`   curl http://${host}:${PORT}/api/v1/users/1?_embed=posts`);
            console.info(`   curl http://${host}:${PORT}/api/v1/posts?title_like=Drizzle`);
            console.info('');
            console.info('📖 API endpoints available at: http://' + host + ':' + PORT + '/api/v1');

            if (useDebugLogging) {
                console.debug('🐛 Debug logging enabled - you will see detailed request/response logs');
            }
        });

    } catch (error: any) {
        console.error({
            error: error?.message || String(error),
            stack: error?.stack
        }, '❌ Failed to start server');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.info('📤 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.info('📤 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
