import { describe, it, expect, beforeEach } from 'vitest';
import {
    apiRequest,
    setupTestDatabase,
    expectSuccessResponse
} from './test-helpers';
import { db } from '@/db/connection';
import * as schema from '@/db/schema.js';
import { eq } from 'drizzle-orm';

describe('JSON-Server Embedding', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('Basic Embedding Tests', () => {
        beforeEach(async () => {
            // Create test user
            const [user] = await db.insert(schema.users).values({
                fullName: 'John Doe',
                phone: '123-456-7890'
            }).returning();

            // Create test posts for the user
            await db.insert(schema.posts).values([
                {
                    title: 'First Post',
                    content: 'This is the first post content',
                    userId: user.id
                },
                {
                    title: 'Second Post',
                    content: 'This is the second post content',
                    userId: user.id
                }
            ]);

            // Create test comments
            const [post] = await db.select().from(schema.posts).where(eq(schema.posts.title, 'First Post'));
            await db.insert(schema.comments).values([
                {
                    text: 'Great post!',
                    postId: post.id,
                    userId: user.id
                },
                {
                    text: 'Very informative',
                    postId: post.id,
                    userId: user.id
                }
            ]);
        });

        it('should embed user data in posts when using _embed=user', async () => {
            const res = await apiRequest.get('/posts?_embed=user');

            expectSuccessResponse(res, 200);
            expect(res.body).toHaveLength(2);

            // Check that each post has embedded user data
            res.body.forEach((post: any) => {
                expect(post).toHaveProperty('id');
                expect(post).toHaveProperty('title');
                expect(post).toHaveProperty('content');
                expect(post).toHaveProperty('userId');
                expect(post).toHaveProperty('user');

                // Verify embedded user data structure
                expect(post.user).toHaveProperty('id');
                expect(post.user).toHaveProperty('fullName', 'John Doe');
                expect(post.user).toHaveProperty('phone', '123-456-7890');
            });
        });

        it('should embed comments data in posts when using _embed=comments', async () => {
            const res = await apiRequest.get('/posts?_embed=comments');

            expectSuccessResponse(res, 200);
            expect(res.body).toHaveLength(2);

            // Find the post that should have comments
            const postWithComments = res.body.find((post: any) => post.title === 'First Post');
            const postWithoutComments = res.body.find((post: any) => post.title === 'Second Post');

            expect(postWithComments).toBeDefined();
            expect(postWithoutComments).toBeDefined();

            // Check embedded comments in first post
            expect(postWithComments).toHaveProperty('comments');
            expect(Array.isArray(postWithComments.comments)).toBe(true);
            expect(postWithComments.comments).toHaveLength(2);

            postWithComments.comments.forEach((comment: any) => {
                expect(comment).toHaveProperty('id');
                expect(comment).toHaveProperty('text');
                expect(comment).toHaveProperty('postId', postWithComments.id);
                expect(comment).toHaveProperty('userId');
            });

            // Check that second post has empty comments array
            expect(postWithoutComments).toHaveProperty('comments');
            expect(Array.isArray(postWithoutComments.comments)).toBe(true);
            expect(postWithoutComments.comments).toHaveLength(0);
        });
    });
});
