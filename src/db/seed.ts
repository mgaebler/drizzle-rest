import { db } from '@/db/connection';
import { users } from '@/db/schema';

export async function seed() {
  console.log('Seeding database...');
  await db.insert(users).values([
    { fullName: 'Alice Smith', phone: '111-222-3333' },
    { fullName: 'Bob Johnson', phone: '444-555-6666' },
    { fullName: 'Charlie Brown', phone: '777-888-9999' },
  ]);
  console.log('Database seeded!');
}
