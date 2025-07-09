import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '@/db/connection';

migrate(db, { migrationsFolder: 'drizzle' });
