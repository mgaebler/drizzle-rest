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

// Test data constants
const TEST_USERS = {
  alice: { fullName: 'Alice Smith', phone: '123-456-7890' },
  bob: { fullName: 'Bob Johnson', phone: '234-567-8901' },
  charlie: { fullName: 'Charlie Brown', phone: '345-678-9012' },
  david: { fullName: 'David Wilson', phone: '456-789-0123' },
  eve: { fullName: 'Eve Davis', phone: '567-890-1234' },
  aliceWonder: { fullName: 'Alice Wonder', phone: '678-901-2345' },
  newUser: { fullName: 'New User', phone: '999-888-7777' },
  primaryKeyTest: { fullName: 'Primary Key Test User', phone: '111-222-3333' },
  specialChars: { fullName: 'Test User (Special)', phone: '+1-800-TEST' }
} as const;

// Helper functions
const createTestUser = async (userData: { fullName: string; phone: string } = TEST_USERS.alice) => {
  const [user] = await db.insert(schema.users).values(userData).returning();
  return user;
};

const createTestUsers = async (count: number, prefix = 'User') => {
  const users = Array.from({ length: count }, (_, i) => ({
    fullName: `${prefix} ${i + 1}`,
    phone: `${(i + 1).toString().padStart(3, '0')}-000-0000`
  }));
  return await db.insert(schema.users).values(users).returning();
};

const createFilteringTestData = async () => {
  return await db.insert(schema.users).values([
    TEST_USERS.alice,
    TEST_USERS.bob,
    TEST_USERS.charlie,
    TEST_USERS.david,
    TEST_USERS.eve,
    TEST_USERS.aliceWonder,
  ]).returning();
};

const expectSuccessResponse = (res: any, expectedStatus = 200) => {
  expect(res.statusCode).toEqual(expectedStatus);
};

const expectUserProperties = (user: any, expectedData?: any) => {
  expect(user).toHaveProperty('id');
  if (expectedData) {
    expect(user.fullName).toEqual(expectedData.fullName);
    if (expectedData.phone) {
      expect(user.phone).toEqual(expectedData.phone);
    }
  }
};

const apiRequest = {
  get: (path: string) => request(app).get(`/api/v1${path}`),
  post: (path: string, data?: any) => request(app).post(`/api/v1${path}`).send(data),
  patch: (path: string, data?: any) => request(app).patch(`/api/v1${path}`).send(data),
  delete: (path: string) => request(app).delete(`/api/v1${path}`)
};

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
    await createTestUsers(3);

    const res = await apiRequest.get('/users');
    expectSuccessResponse(res);
    expect(res.body).toHaveLength(3);
    expectUserProperties(res.body[0], { fullName: 'User 1' });
  });

  it('should create a new user', async () => {
    const res = await apiRequest.post('/users', TEST_USERS.newUser);
    expectSuccessResponse(res, 201);
    expectUserProperties(res.body, TEST_USERS.newUser);

    const allUsers = await apiRequest.get('/users');
    expect(allUsers.body).toHaveLength(1);
  });

  it('should get a user by ID', async () => {
    const createdUser = await createTestUser();

    const res = await apiRequest.get(`/users/${createdUser.id}`);
    expectSuccessResponse(res);
    expectUserProperties(res.body, TEST_USERS.alice);
  });

  it('should update a user by ID', async () => {
    const createdUser = await createTestUser();
    const updateData = { fullName: 'Alice Wonderland' };

    const res = await apiRequest.patch(`/users/${createdUser.id}`, updateData);
    expectSuccessResponse(res);
    expect(res.body.fullName).toEqual(updateData.fullName);

    const fetchedUser = await apiRequest.get(`/users/${createdUser.id}`);
    expect(fetchedUser.body.fullName).toEqual(updateData.fullName);
  });

  it('should delete a user by ID', async () => {
    const createdUser = await createTestUser();

    const res = await apiRequest.delete(`/users/${createdUser.id}`);
    expectSuccessResponse(res, 204);

    const updatedUsers = await apiRequest.get('/users');
    expect(updatedUsers.body).toHaveLength(0);
  });

  it('should return 404 for a non-existent user', async () => {
    const res = await apiRequest.get('/users/999');
    expect(res.statusCode).toEqual(404);
  });

  it('should handle dynamic primary key detection', async () => {
    const createdUser = await createTestUser(TEST_USERS.primaryKeyTest);

    const res = await apiRequest.get(`/users/${createdUser.id}`);
    expectSuccessResponse(res);
    expectUserProperties(res.body, TEST_USERS.primaryKeyTest);

    const updateRes = await apiRequest.patch(`/users/${createdUser.id}`,
      { fullName: 'Updated Primary Key Test User' });
    expectSuccessResponse(updateRes);
    expect(updateRes.body.fullName).toEqual('Updated Primary Key Test User');
  });

  describe('Basic Pagination Tests', () => {
    beforeEach(async () => {
      await createTestUsers(15);
    });

    const expectPaginationHeaders = (res: any, totalCount: string) => {
      expectSuccessResponse(res);
      expect(res.headers['x-total-count']).toEqual(totalCount);
    };

    it('should apply default pagination (first 10 items)', async () => {
      const res = await apiRequest.get('/users');

      expectPaginationHeaders(res, '15');
      expect(res.body).toHaveLength(10);
      expect(res.body[0].fullName).toEqual('User 1');
      expect(res.body[9].fullName).toEqual('User 10');
    });

    it('should paginate with _page and _per_page parameters', async () => {
      const res = await apiRequest.get('/users?_page=2&_per_page=5');

      expectPaginationHeaders(res, '15');
      expect(res.body).toHaveLength(5);
      expect(res.body[0].fullName).toEqual('User 6');
      expect(res.body[4].fullName).toEqual('User 10');
    });

    it('should handle last page with fewer items', async () => {
      const res = await apiRequest.get('/users?_page=3&_per_page=5');

      expectPaginationHeaders(res, '15');
      expect(res.body).toHaveLength(5);
      expect(res.body[0].fullName).toEqual('User 11');
      expect(res.body[4].fullName).toEqual('User 15');
    });

    it('should return empty array for page beyond available data', async () => {
      const res = await apiRequest.get('/users?_page=5&_per_page=5');

      expectPaginationHeaders(res, '15');
      expect(res.body).toHaveLength(0);
    });
  });

  describe('Range Pagination Tests', () => {
    beforeEach(async () => {
      await createTestUsers(15);
    });

    it('should return items from _start to _end (exclusive)', async () => {
      const res = await apiRequest.get('/users?_start=3&_end=7');

      expectSuccessResponse(res);
      expect(res.headers['x-total-count']).toEqual('15');
      expect(res.body).toHaveLength(4); // Items 3,4,5,6 (4 items)
      expect(res.body[0].fullName).toEqual('User 4'); // 0-indexed, so item 3 is "User 4"
      expect(res.body[3].fullName).toEqual('User 7');
    });

    it('should return _limit items starting from _start', async () => {
      const res = await apiRequest.get('/users?_start=5&_limit=3');

      expectSuccessResponse(res);
      expect(res.headers['x-total-count']).toEqual('15');
      expect(res.body).toHaveLength(3);
      expect(res.body[0].fullName).toEqual('User 6');
      expect(res.body[2].fullName).toEqual('User 8');
    });

    it('should prioritize range pagination over page-based pagination', async () => {
      const res = await apiRequest.get('/users?_page=2&_per_page=5&_start=2&_end=5');

      expectSuccessResponse(res);
      expect(res.headers['x-total-count']).toEqual('15');
      expect(res.body).toHaveLength(3); // _start=2, _end=5 gives 3 items
      expect(res.body[0].fullName).toEqual('User 3');
      expect(res.body[2].fullName).toEqual('User 5');
    });

  });

  describe('JSON-Server Filtering Tests', () => {
    beforeEach(async () => {
      await createFilteringTestData();
    });

    const expectFilterResults = (res: any, expectedLength: number, validator?: (users: any[]) => boolean) => {
      expectSuccessResponse(res);
      expect(res.body).toHaveLength(expectedLength);
      if (validator) {
        expect(validator(res.body)).toBe(true);
      }
    };

    describe('Direct Equality Filtering', () => {
      it('should filter by exact match', async () => {
        const res = await apiRequest.get('/users?fullName=Alice Smith');
        expectFilterResults(res, 1, (users) => users[0].fullName === 'Alice Smith');
      });

      it('should support multiple filters with AND logic', async () => {
        const res = await apiRequest.get('/users?fullName=Alice Smith&phone=123-456-7890');
        expectFilterResults(res, 1, (users) =>
          users[0].fullName === 'Alice Smith' && users[0].phone === '123-456-7890'
        );
      });

      it('should return empty array when no match found', async () => {
        const res = await apiRequest.get('/users?fullName=NonExistent User');
        expectFilterResults(res, 0);
      });
    });

    describe('String Search Filtering (_like operator)', () => {
      it('should filter with substring search using _like', async () => {
        const res = await apiRequest.get('/users?fullName_like=Alice');
        expectFilterResults(res, 2, (users) =>
          users.every((user: any) => user.fullName.includes('Alice'))
        );
      });

      it('should be case-sensitive for _like search', async () => {
        const res = await apiRequest.get('/users?fullName_like=alice');
        expectFilterResults(res, 0);
      });

      it('should work with phone number _like search', async () => {
        const res = await apiRequest.get('/users?phone_like=456-7890');
        expectFilterResults(res, 1, (users) => users[0].phone === '123-456-7890');
      });
    });

    describe('Negation Filtering (_ne operator)', () => {
      it('should exclude records with _ne operator', async () => {
        const res = await apiRequest.get('/users?fullName_ne=Alice Smith');
        expectFilterResults(res, 5, (users) =>
          users.every((user: any) => user.fullName !== 'Alice Smith')
        );
      });

      it('should work with _ne on phone numbers', async () => {
        const res = await apiRequest.get('/users?phone_ne=123-456-7890');
        expectFilterResults(res, 5, (users) =>
          users.every((user: any) => user.phone !== '123-456-7890')
        );
      });
    });

    describe('Array Membership Filtering', () => {
      it('should filter by multiple IDs', async () => {
        const allUsers = await apiRequest.get('/users');
        const firstTwoIds = allUsers.body.slice(0, 2).map((user: any) => user.id);

        const res = await apiRequest.get(`/users?id=${firstTwoIds[0]}&id=${firstTwoIds[1]}`);
        expectFilterResults(res, 2, (users) =>
          users.map((user: any) => user.id).sort().join(',') === firstTwoIds.sort().join(',')
        );
      });

      it('should filter by multiple fullName values', async () => {
        const res = await apiRequest.get('/users?fullName=Alice Smith&fullName=Bob Johnson');
        expectFilterResults(res, 2, (users) => {
          const names = users.map((user: any) => user.fullName).sort();
          return names.join(',') === 'Alice Smith,Bob Johnson';
        });
      });
    });

    describe('Combined Filtering', () => {
      it('should combine different filter types with AND logic', async () => {
        const res = await apiRequest.get('/users?fullName_like=Alice&phone_ne=678-901-2345');
        expectFilterResults(res, 1, (users) => users[0].fullName === 'Alice Smith');
      });

      it('should work with filtering + pagination', async () => {
        const res = await apiRequest.get('/users?fullName_like=Alice&_page=1&_per_page=1');
        expectSuccessResponse(res);
        expect(res.body).toHaveLength(1);
        expect(res.headers['x-total-count']).toEqual('2');
        expect(res.body[0].fullName.includes('Alice')).toBe(true);
      });

      it('should work with filtering + sorting', async () => {
        const res = await apiRequest.get('/users?fullName_like=Alice&sort=fullName.desc');
        expectFilterResults(res, 2, (users) =>
          users[0].fullName === 'Alice Wonder' && users[1].fullName === 'Alice Smith'
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty filter values', async () => {
        const res = await apiRequest.get('/users?fullName=');
        expectFilterResults(res, 0);
      });

      it('should ignore invalid filter parameters', async () => {
        const res = await apiRequest.get('/users?nonExistentColumn=value');
        expectFilterResults(res, 6);
      });

      it('should handle special characters in filter values', async () => {
        await createTestUser(TEST_USERS.specialChars);
        const res = await apiRequest.get('/users?fullName_like=(Special)');
        expectFilterResults(res, 1, (users) => users[0].fullName === 'Test User (Special)');
      });
    });

    describe('Range Filtering (_gte and _lte operators)', () => {
      const expectRangeFilter = (users: any[], condition: (id: number) => boolean) => {
        return users.every((user: any) => condition(user.id));
      };

      it('should filter with _gte operator', async () => {
        const res = await apiRequest.get('/users?id_gte=4');
        expectSuccessResponse(res);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
        expect(expectRangeFilter(res.body, (id) => id >= 4)).toBe(true);
      });

      it('should filter with _lte operator', async () => {
        const res = await apiRequest.get('/users?id_lte=3');
        expectSuccessResponse(res);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
        expect(expectRangeFilter(res.body, (id) => id <= 3)).toBe(true);
      });

      it('should combine _gte and _lte for range filtering', async () => {
        const res = await apiRequest.get('/users?id_gte=2&id_lte=5');
        expectSuccessResponse(res);
        expect(res.body.length).toBeGreaterThanOrEqual(4);
        expect(expectRangeFilter(res.body, (id) => id >= 2 && id <= 5)).toBe(true);
      });
    });
  });
});

describe('PUT Method Tests', () => {
  beforeEach(async () => {
    await migrate(db, { migrationsFolder: './drizzle' });
    await db.delete(schema.users);
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  });

  it('should replace a user completely with PUT', async () => {
    // Create initial user
    const createRes = await request(app)
      .post('/api/v1/users')
      .send({ fullName: 'John Doe', phone: '123-456-7890' });

    expect(createRes.status).toBe(201);
    const userId = createRes.body.id;

    // Replace with PUT (must provide all fields)
    const putRes = await request(app)
      .put(`/api/v1/users/${userId}`)
      .send({ fullName: 'Jane Smith', phone: '987-654-3210' });

    expect(putRes.status).toBe(200);
    expect(putRes.body.fullName).toBe('Jane Smith');
    expect(putRes.body.phone).toBe('987-654-3210');

    // Verify the user was completely replaced
    const getRes = await request(app).get(`/api/v1/users/${userId}`);
    expect(getRes.body.fullName).toBe('Jane Smith');
    expect(getRes.body.phone).toBe('987-654-3210');
  });

  it('should return 404 for PUT on non-existent user', async () => {
    const res = await request(app)
      .put('/api/v1/users/999')
      .send({ fullName: 'Non Existent', phone: '000-000-0000' });

    expect(res.status).toBe(404);
  });
});
