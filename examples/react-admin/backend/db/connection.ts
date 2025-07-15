import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from './schema';

// Create PGlite instance - using in-memory database for demo
const client = new PGlite();

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });
