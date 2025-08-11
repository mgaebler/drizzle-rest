import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

// Create an in-memory SQLite database for this example
const client = createClient({
    url: ':memory:'
});

export const db = drizzle(client);
