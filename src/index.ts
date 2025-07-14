import { migrate } from 'drizzle-orm/pglite/migrator';
import express from 'express';

import { db } from '@/db/connection';
import * as schema from '@/db/schema';
import { seed } from '@/db/seed';
import { createDrizzleRestAdapter } from '@/drizzle-rest-adapter';

async function startServer() {
    const app = express();
    app.use(express.json());

    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' });

    // Seed database
    await seed();

    const drizzleApiRouter = createDrizzleRestAdapter({
        db: db,
        schema: schema,
        // Enable OpenAPI documentation generation
        openapi: {
            info: {
                title: 'Drizzle REST API Demo',
                version: '1.0.0',
                description: 'Auto-generated REST API from Drizzle schema with JSON-Server compatibility'
            }
        }
    });

    app.use('/api/v1', drizzleApiRouter);

    app.listen(3000, () => {
        console.log('Server with Drizzle REST Adapter is running on port 3000');
        console.log('API Documentation: http://localhost:3000/api/v1/openapi.json');
        console.log('Example requests:');
        console.log('  GET http://localhost:3000/api/v1/users?_page=1&_per_page=5');
        console.log('  GET http://localhost:3000/api/v1/posts?_embed=user&_sort=-createdAt');
    });
}

startServer().catch(console.error);
