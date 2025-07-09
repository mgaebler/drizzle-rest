import { db } from '@/db/connection';
import { dbTables } from '@/db/schema';

import { seed as drizzleSeed } from "drizzle-seed";


export async function seed() {
  console.log('Seeding database...');
  await drizzleSeed(db, dbTables).refine((f) => ({
    users: {
      columns: {
        phone: f.phoneNumber({ template: '+49 (###) ###-####' }),
      }
    }
  }));
  console.log('Database seeded!');
}
