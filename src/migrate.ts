import { migrate } from 'drizzle-orm/pglite/migrator';
import { db } from '@/db/connection';

await migrate(db, { migrationsFolder: 'drizzle' });
