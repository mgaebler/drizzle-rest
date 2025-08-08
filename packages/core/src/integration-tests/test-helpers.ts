import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/pglite/migrator';
import express from 'express';
import request from 'supertest';
import { expect } from 'vitest';

import { createExpressDrizzleRestAdapter } from '../adapters/express-adapter';
import { ICoreAdapterOptions } from '../core/core-adapter';
import { createLogger } from '../core/logger';
import { db } from '../db/connection';
import * as schema from '../db/schema.js';

// Type alias for backward compatibility
type DrizzleRestAdapterOptions = Omit<ICoreAdapterOptions, 'adapter'>;

// Shared test logger instance - consistent across all tests
const testLogger = createLogger({
    level: 'warn', // Only show warnings and errors during tests
    pretty: false, // Use JSON format for better test output parsing
});

// Standard test adapter options that should be used across all test files
export const createTestAdapterOptions = (
    tableOptions?: DrizzleRestAdapterOptions['tableOptions']
): DrizzleRestAdapterOptions => ({
    db,
    schema,
    logger: testLogger,
    ...((tableOptions && { tableOptions }) || {}),
});

// Setup Express app with Drizzle REST adapter using consistent test configuration
const setupExpressApp = (tableOptions?: DrizzleRestAdapterOptions['tableOptions']): express.Application => {
    const app = express();
    app.use(express.json());

    const drizzleApiRouter = createExpressDrizzleRestAdapter(createTestAdapterOptions(tableOptions));

    app.use('/api/v1', drizzleApiRouter);
    return app;
};

export const app = setupExpressApp();

// Test data constants
export const TEST_USERS = {
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
export const createTestUser = async (userData: { fullName: string; phone: string } = TEST_USERS.alice) => {
    const [user] = await db.insert(schema.users).values(userData).returning();
    return user;
};

export const createTestUsers = async (count: number, prefix = 'User') => {
    const users = Array.from({ length: count }, (_, i) => ({
        fullName: `${prefix} ${i + 1}`,
        phone: `${(i + 1).toString().padStart(3, '0')}-000-0000`
    }));
    return await db.insert(schema.users).values(users).returning();
};

export const createFilteringTestData = async () => {
    return await db.insert(schema.users).values([
        TEST_USERS.alice,
        TEST_USERS.bob,
        TEST_USERS.charlie,
        TEST_USERS.david,
        TEST_USERS.eve,
        TEST_USERS.aliceWonder,
    ]).returning();
};

export const createTestPosts = async (userId: number) => {
    return await db.insert(schema.posts).values([
        {
            title: 'First Post',
            content: 'This is the first post content',
            userId
        },
        {
            title: 'Second Post',
            content: 'This is the second post content',
            userId
        }
    ]).returning();
};

export const createTestComments = async (postId: number, userId: number) => {
    return await db.insert(schema.comments).values([
        {
            text: 'Great post!',
            postId,
            userId
        },
        {
            text: 'Very informative',
            postId,
            userId
        }
    ]).returning();
};

// Common assertion helpers
export const expectSuccessResponse = (res: any, expectedStatus = 200) => {
    expect(res.statusCode).toEqual(expectedStatus);
};

export const expectUserProperties = (user: any, expectedData?: any) => {
    expect(user).toHaveProperty('id');
    if (expectedData) {
        expect(user.fullName).toEqual(expectedData.fullName);
        if (expectedData.phone) {
            expect(user.phone).toEqual(expectedData.phone);
        }
    }
};

export const expectPaginationHeaders = (res: any, totalCount: string) => {
    expectSuccessResponse(res);
    expect(res.headers['x-total-count']).toEqual(totalCount);
};

export const expectFilterResults = (res: any, expectedLength: number, validator?: (users: any[]) => boolean) => {
    expectSuccessResponse(res);
    expect(res.body).toHaveLength(expectedLength);
    if (validator) {
        expect(validator(res.body)).toBe(true);
    }
};

// Embedding-specific assertion helpers
export const expectEmbeddedUserData = (post: any, expectedUser: typeof TEST_USERS.alice) => {
    expect(post).toHaveProperty('user');
    expect(post.user).toHaveProperty('id');
    expect(post.user).toHaveProperty('fullName', expectedUser.fullName);
    expect(post.user).toHaveProperty('phone', expectedUser.phone);
};

export const expectEmbeddedCommentsData = (post: any, expectedCommentCount: number) => {
    expect(post).toHaveProperty('comments');
    expect(Array.isArray(post.comments)).toBe(true);
    expect(post.comments).toHaveLength(expectedCommentCount);

    if (expectedCommentCount > 0) {
        post.comments.forEach((comment: any) => {
            expect(comment).toHaveProperty('id');
            expect(comment).toHaveProperty('text');
            expect(comment).toHaveProperty('postId', post.id);
            expect(comment).toHaveProperty('userId');
        });
    }
};

// API request utilities
export const apiRequest = {
    get: (path: string) => request(app).get(`/api/v1${path}`),
    post: (path: string, data?: any) => request(app).post(`/api/v1${path}`).send(data),
    patch: (path: string, data?: any) => request(app).patch(`/api/v1${path}`).send(data),
    put: (path: string, data?: any) => request(app).put(`/api/v1${path}`).send(data),
    delete: (path: string) => request(app).delete(`/api/v1${path}`)
};

// Database setup helpers
export const setupTestDatabase = async () => {
    // Run migrations first
    await migrate(db, { migrationsFolder: './drizzle' });

    // Clear tables in correct order (child tables first to avoid foreign key violations)
    await db.delete(schema.comments); // Delete comments first
    await db.delete(schema.posts);    // Then posts
    await db.delete(schema.users);    // Finally users

    // Reset the auto-increment counters
    await db.execute(sql`ALTER SEQUENCE comments_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE posts_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
};
