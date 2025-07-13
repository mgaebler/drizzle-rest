import express from 'express';
import { createDrizzleRestAdapter } from '@/drizzle-rest-adapter';
import { db } from '@/db/connection';
import * as schema from '@/db/schema';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { seed } from '@/db/seed';

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
    });

    app.use('/api/v1', drizzleApiRouter);

    app.listen(3000, () => {
        console.log('Server with Drizzle REST Adapter is running on port 3000');
    });
}

startServer().catch(console.error);
