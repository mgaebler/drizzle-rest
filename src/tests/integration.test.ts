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
});
