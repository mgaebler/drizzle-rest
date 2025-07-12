import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach } from 'vitest';
import { createDrizzleRestAdapter } from '../drizzle-rest-adapter';
import { db } from '@/db/connection';
import * as schema from '@/db/schema.js';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';

const app = express();
app.use(express.json());

const drizzleApiRouter = createDrizzleRestAdapter({
  db: db,
  schema: schema,
});

app.use('/api/v1', drizzleApiRouter);

describe('Drizzle REST Adapter Integration Tests', () => {
  beforeEach(async () => {
    // Run migrations first
    await migrate(db, { migrationsFolder: './drizzle' });
    // Clear the table before each test
    await db.delete(schema.users);
    // Reset the auto-increment counter
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  });

  it('should get all users', async () => {
    // Create test data
    await db.insert(schema.users).values([
      { fullName: 'Alice Smith', phone: '123-456-7890' },
      { fullName: 'Bob Johnson', phone: '234-567-8901' },
      { fullName: 'Charlie Brown', phone: '345-678-9012' },
    ]);

    const res = await request(app).get('/api/v1/users');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0].fullName).toEqual('Alice Smith');
  });

  it('should create a new user', async () => {
    const newUser = { fullName: 'New User', phone: '999-888-7777' };
    const res = await request(app).post('/api/v1/users').send(newUser);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.fullName).toEqual('New User');

    const allUsers = await request(app).get('/api/v1/users');
    expect(allUsers.body).toHaveLength(1);
  });

  it('should get a user by ID', async () => {
    // Create test data
    const [createdUser] = await db.insert(schema.users).values({
      fullName: 'Alice Smith',
      phone: '123-456-7890'
    }).returning();

    const res = await request(app).get(`/api/v1/users/${createdUser.id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.fullName).toEqual('Alice Smith');
  });

  it('should update a user by ID', async () => {
    // Create test data
    const [createdUser] = await db.insert(schema.users).values({
      fullName: 'Alice Smith',
      phone: '123-456-7890'
    }).returning();

    const updatedUser = { fullName: 'Alice Wonderland' };
    const res = await request(app).patch(`/api/v1/users/${createdUser.id}`).send(updatedUser);
    expect(res.statusCode).toEqual(200);
    expect(res.body.fullName).toEqual('Alice Wonderland');

    const fetchedUser = await request(app).get(`/api/v1/users/${createdUser.id}`);
    expect(fetchedUser.body.fullName).toEqual('Alice Wonderland');
  });

  it('should delete a user by ID', async () => {
    // Create test data
    const [createdUser] = await db.insert(schema.users).values({
      fullName: 'Alice Smith',
      phone: '123-456-7890'
    }).returning();

    const res = await request(app).delete(`/api/v1/users/${createdUser.id}`);
    expect(res.statusCode).toEqual(204);

    const updatedUsers = await request(app).get('/api/v1/users');
    expect(updatedUsers.body).toHaveLength(0);
  });

  it('should return 404 for a non-existent user', async () => {
    const res = await request(app).get('/api/v1/users/999');
    expect(res.statusCode).toEqual(404);
  });

  it('should handle dynamic primary key detection', async () => {
    // This test verifies that the adapter correctly identifies the primary key column
    // Even though our current schema uses 'id', the adapter should work with any primary key name

    // Create test data using the actual primary key
    const [createdUser] = await db.insert(schema.users).values({
      fullName: 'Primary Key Test User',
      phone: '111-222-3333'
    }).returning();

    // The adapter should use the detected primary key ('id' in this case)
    // rather than hardcoding 'id' in the query
    const res = await request(app).get(`/api/v1/users/${createdUser.id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.fullName).toEqual('Primary Key Test User');

    // Verify that the same record can be updated using the dynamic primary key
    const updateRes = await request(app)
      .patch(`/api/v1/users/${createdUser.id}`)
      .send({ fullName: 'Updated Primary Key Test User' });

    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body.fullName).toEqual('Updated Primary Key Test User');
  });

  describe('Basic Pagination Tests', () => {
    beforeEach(async () => {
      // Create test data for pagination tests - 15 users
      const users = Array.from({ length: 15 }, (_, i) => ({
        fullName: `User ${i + 1}`,
        phone: `${(i + 1).toString().padStart(3, '0')}-000-0000`
      }));

      await db.insert(schema.users).values(users);
    });

    it('should apply default pagination (first 10 items)', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(10); // Default page size
      expect(res.headers['x-total-count']).toEqual('15');

      // Should return first 10 items
      expect(res.body[0].fullName).toEqual('User 1');
      expect(res.body[9].fullName).toEqual('User 10');
    });

    it('should paginate with _page and _per_page parameters', async () => {
      const res = await request(app).get('/api/v1/users?_page=2&_per_page=5');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(5);
      expect(res.headers['x-total-count']).toEqual('15');

      // Second page with 5 items should return users 6-10
      expect(res.body[0].fullName).toEqual('User 6');
      expect(res.body[4].fullName).toEqual('User 10');
    });

    it('should handle last page with fewer items', async () => {
      const res = await request(app).get('/api/v1/users?_page=3&_per_page=5');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(5); // Users 11-15
      expect(res.headers['x-total-count']).toEqual('15');

      expect(res.body[0].fullName).toEqual('User 11');
      expect(res.body[4].fullName).toEqual('User 15');
    });

    it('should return empty array for page beyond available data', async () => {
      const res = await request(app).get('/api/v1/users?_page=5&_per_page=5');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(0);
      expect(res.headers['x-total-count']).toEqual('15');
    });
  });

  describe('JSON-Server Filtering Tests', () => {
    beforeEach(async () => {
      // Create test data with various data types for filtering tests
      await db.insert(schema.users).values([
        { fullName: 'Alice Smith', phone: '123-456-7890' },
        { fullName: 'Bob Johnson', phone: '234-567-8901' },
        { fullName: 'Charlie Brown', phone: '345-678-9012' },
        { fullName: 'David Wilson', phone: '456-789-0123' },
        { fullName: 'Eve Davis', phone: '567-890-1234' },
        { fullName: 'Alice Wonder', phone: '678-901-2345' },
      ]);
    });

    describe('Direct Equality Filtering', () => {
      it('should filter by exact match', async () => {
        const res = await request(app).get('/api/v1/users?fullName=Alice Smith');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].fullName).toEqual('Alice Smith');
      });

      it('should support multiple filters with AND logic', async () => {
        const res = await request(app).get('/api/v1/users?fullName=Alice Smith&phone=123-456-7890');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].fullName).toEqual('Alice Smith');
        expect(res.body[0].phone).toEqual('123-456-7890');
      });

      it('should return empty array when no match found', async () => {
        const res = await request(app).get('/api/v1/users?fullName=NonExistent User');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(0);
      });
    });

    describe('String Search Filtering (_like operator)', () => {
      it('should filter with substring search using _like', async () => {
        const res = await request(app).get('/api/v1/users?fullName_like=Alice');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(2); // Alice Smith and Alice Wonder
        expect(res.body.every((user: any) => user.fullName.includes('Alice'))).toBe(true);
      });

      it('should be case-sensitive for _like search', async () => {
        const res = await request(app).get('/api/v1/users?fullName_like=alice');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(0); // Should not match lowercase
      });

      it('should work with phone number _like search', async () => {
        const res = await request(app).get('/api/v1/users?phone_like=456-7890');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].phone).toEqual('123-456-7890');
      });
    });

    describe('Negation Filtering (_ne operator)', () => {
      it('should exclude records with _ne operator', async () => {
        const res = await request(app).get('/api/v1/users?fullName_ne=Alice Smith');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(5); // All except Alice Smith
        expect(res.body.every((user: any) => user.fullName !== 'Alice Smith')).toBe(true);
      });

      it('should work with _ne on phone numbers', async () => {
        const res = await request(app).get('/api/v1/users?phone_ne=123-456-7890');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(5); // All except the one with that phone
        expect(res.body.every((user: any) => user.phone !== '123-456-7890')).toBe(true);
      });
    });

    describe('Array Membership Filtering', () => {
      it('should filter by multiple IDs', async () => {
        // Get first two users to get their IDs
        const allUsers = await request(app).get('/api/v1/users');
        const firstTwoIds = allUsers.body.slice(0, 2).map((user: any) => user.id);

        const res = await request(app).get(`/api/v1/users?id=${firstTwoIds[0]}&id=${firstTwoIds[1]}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(2);
        expect(res.body.map((user: any) => user.id).sort()).toEqual(firstTwoIds.sort());
      });

      it('should filter by multiple fullName values', async () => {
        const res = await request(app).get('/api/v1/users?fullName=Alice Smith&fullName=Bob Johnson');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(2);
        const names = res.body.map((user: any) => user.fullName).sort();
        expect(names).toEqual(['Alice Smith', 'Bob Johnson']);
      });
    });

    describe('Combined Filtering', () => {
      it('should combine different filter types with AND logic', async () => {
        const res = await request(app).get('/api/v1/users?fullName_like=Alice&phone_ne=678-901-2345');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1); // Only Alice Smith, not Alice Wonder
        expect(res.body[0].fullName).toEqual('Alice Smith');
      });

      it('should work with filtering + pagination', async () => {
        const res = await request(app).get('/api/v1/users?fullName_like=Alice&_page=1&_per_page=1');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.headers['x-total-count']).toEqual('2'); // Total matching records
        expect(res.body[0].fullName.includes('Alice')).toBe(true);
      });

      it('should work with filtering + sorting', async () => {
        const res = await request(app).get('/api/v1/users?fullName_like=Alice&sort=fullName.desc');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].fullName).toEqual('Alice Wonder'); // Alphabetically last
        expect(res.body[1].fullName).toEqual('Alice Smith');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty filter values', async () => {
        const res = await request(app).get('/api/v1/users?fullName=');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(0); // No user with empty name
      });

      it('should ignore invalid filter parameters', async () => {
        const res = await request(app).get('/api/v1/users?nonExistentColumn=value');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(6); // Should return all users (ignore invalid filter)
      });

      it('should handle special characters in filter values', async () => {
        // First create a user with special characters
        await db.insert(schema.users).values({
          fullName: 'Test User (Special)',
          phone: '+1-800-TEST'
        });

        const res = await request(app).get('/api/v1/users?fullName_like=(Special)');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].fullName).toEqual('Test User (Special)');
      });
    });

    describe('Range Filtering (_gte and _lte operators)', () => {
      beforeEach(async () => {
        // Create test data with numerical IDs for range testing
        // The auto-increment should give us IDs 1, 2, 3, 4, 5, 6
        // (6 users were created in the main beforeEach)
      });

      it('should filter with _gte operator', async () => {
        const res = await request(app).get('/api/v1/users?id_gte=4');

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThanOrEqual(3); // IDs 4, 5, 6
        expect(res.body.every((user: any) => user.id >= 4)).toBe(true);
      });

      it('should filter with _lte operator', async () => {
        const res = await request(app).get('/api/v1/users?id_lte=3');

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThanOrEqual(3); // IDs 1, 2, 3
        expect(res.body.every((user: any) => user.id <= 3)).toBe(true);
      });

      it('should combine _gte and _lte for range filtering', async () => {
        const res = await request(app).get('/api/v1/users?id_gte=2&id_lte=5');

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThanOrEqual(4); // IDs 2, 3, 4, 5
        expect(res.body.every((user: any) => user.id >= 2 && user.id <= 5)).toBe(true);
      });
    });
  });
});