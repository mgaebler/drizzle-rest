import express from 'express';
import { createDrizzleRestAdapter } from '@/drizzle-rest-adapter';
import { db } from '@/db/connection';
import * as schema from '@/db/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { seed } from '@/db/seed';

const app = express();
app.use(express.json());

// Run migrations
migrate(db, { migrationsFolder: './drizzle' });

// Seed database
seed();

const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
});

app.use('/api/v1', drizzleApiRouter);

app.listen(3000, () => {
  console.log('Server with Drizzle REST Adapter is running on port 3000');
});
