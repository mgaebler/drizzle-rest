import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach } from 'vitest';
import { createDrizzleRestAdapter } from '../drizzle-rest-adapter';
import { db } from '@/db/connection';
import * as schema from '@/db/schema.js';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { seed } from '../db/seed.js';

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
    // Re-seed the database
    await seed();
  });

  it('should get all users', async () => {
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
    expect(allUsers.body).toHaveLength(4);
  });

  it('should get a user by ID', async () => {
    // First get all users to find a valid ID
    const allUsers = await request(app).get('/api/v1/users');
    const firstUserId = allUsers.body[0].id;

    const res = await request(app).get(`/api/v1/users/${firstUserId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.fullName).toEqual('Alice Smith');
  });

  it('should update a user by ID', async () => {
    // First get all users to find a valid ID
    const allUsers = await request(app).get('/api/v1/users');
    const firstUserId = allUsers.body[0].id;

    const updatedUser = { fullName: 'Alice Wonderland' };
    const res = await request(app).patch(`/api/v1/users/${firstUserId}`).send(updatedUser);
    expect(res.statusCode).toEqual(200);
    expect(res.body.fullName).toEqual('Alice Wonderland');

    const fetchedUser = await request(app).get(`/api/v1/users/${firstUserId}`);
    expect(fetchedUser.body.fullName).toEqual('Alice Wonderland');
  });

  it('should delete a user by ID', async () => {
    // First get all users to find a valid ID
    const allUsers = await request(app).get('/api/v1/users');
    const firstUserId = allUsers.body[0].id;

    const res = await request(app).delete(`/api/v1/users/${firstUserId}`);
    expect(res.statusCode).toEqual(204);

    const updatedUsers = await request(app).get('/api/v1/users');
    expect(updatedUsers.body).toHaveLength(2);
  });

  it('should return 404 for a non-existent user', async () => {
    const res = await request(app).get('/api/v1/users/999');
    expect(res.statusCode).toEqual(404);
  });
});
