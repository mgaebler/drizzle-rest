import { migrate } from 'drizzle-orm/pglite/migrator';
import { createDrizzleRestAdapter, createLogger } from 'drizzle-rest-adapter';
import express from 'express';

import { db } from '@/db/connection';
import * as schema from '@/db/schema';
import { seedDatabase } from '@/db/seed';

const app = express();
const PORT = process.env.PORT || 3000;

// Create a logger instance for development
const useDebugLogging = false; // Set to true for detailed logging
const logger = createLogger({
    level: useDebugLogging ? 'debug' : 'info',
    pretty: true,
    base: {
        environment: process.env.NODE_ENV || 'development'
    }
});

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
            swaggerUI: `${baseUrl}/api/v1/api-docs`,
            discovery: `${baseUrl}/api/v1/discovery`,
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
        logger.info('🔄 Running database migrations...');
        await migrate(db, { migrationsFolder: './drizzle' });

        logger.info('🌱 Seeding database...');
        await seedDatabase();

        // Create the REST API adapter with logging enabled
        const apiRouter = createDrizzleRestAdapter({
            db: db as any,
            schema: schema,
            logging: {
                logger,
                requestLogging: {
                    enabled: true,
                    logQuery: true,
                    logBody: useDebugLogging, // Only log request bodies when debug logging is enabled
                    logResponseBody: false, // Keep response logging disabled for performance
                    logHeaders: useDebugLogging
                }
            },
            // Enable OpenAPI documentation generation with API explorer features
            openapi: {
                info: {
                    title: 'Drizzle REST Adapter Demo API',
                    version: '1.0.0',
                    description: 'A demonstration of the drizzle-rest-adapter with comprehensive logging and API exploration features'
                },
                // Enable Swagger UI for interactive API testing
                ui: {
                    enabled: true,
                    path: '/api-docs',
                    title: 'Drizzle REST API Explorer',
                    customCss: `
                        .swagger-ui .topbar { background-color: #1a1a1a; }
                        .swagger-ui .topbar .download-url-wrapper { display: none; }
                        .swagger-ui .info .title { color: #2563eb; }
                    `
                },
                // Enable API discovery endpoint for programmatic exploration
                discovery: {
                    enabled: true,
                    path: '/discovery'
                }
            }
        });

        // Mount the API routes
        app.use('/api/v1', apiRouter);

        app.listen(Number(PORT), '0.0.0.0', () => {
            logger.info({
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                debugLogging: useDebugLogging,
                openApiUrl: `http://0.0.0.0:${PORT}/api/v1/openapi.json`
            }, '🎉 Server started successfully!');

            logger.info('🌐 Server running on http://0.0.0.0:' + PORT);
            logger.info('📚 API Documentation:');
            logger.info(`   OpenAPI Spec: http://0.0.0.0:${PORT}/api/v1/openapi.json`);
            logger.info(`   Swagger UI: http://0.0.0.0:${PORT}/api/v1/api-docs`);
            logger.info(`   API Discovery: http://0.0.0.0:${PORT}/api/v1/discovery`);
            logger.info('🔍 Health Check: http://0.0.0.0:' + PORT + '/health');
            logger.info('');
            logger.info('🚀 Try these example requests:');
            logger.info(`   curl http://0.0.0.0:${PORT}/api/v1/posts?published=1&_sort=-createdAt&_page=1&_per_page=3`);
            logger.info(`   curl http://0.0.0.0:${PORT}/api/v1/users/1?_embed=posts`);
            logger.info(`   curl http://0.0.0.0:${PORT}/api/v1/posts?title_like=Drizzle`);
            logger.info('');
            logger.info('📖 Full documentation available at the root endpoint: http://0.0.0.0:' + PORT);

            if (useDebugLogging) {
                logger.debug('🐛 Debug logging enabled - you will see detailed request/response logs');
            }
        });

    } catch (error: any) {
        logger.error({
            error: error?.message || String(error),
            stack: error?.stack
        }, '❌ Failed to start server');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('📤 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('📤 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();
