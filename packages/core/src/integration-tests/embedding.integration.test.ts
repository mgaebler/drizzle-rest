import { beforeEach, describe, expect, it } from 'vitest';

import {
    apiRequest,
    createTestComments,
    createTestPosts,
    createTestUser,
    expectEmbeddedCommentsData,
    expectEmbeddedUserData,
    expectSuccessResponse,
    setupTestDatabase,
    TEST_USERS
} from './test-helpers';

describe('JSON-Server Embedding', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('Basic Embedding Tests', () => {
        beforeEach(async () => {
            // Create test user using helper
            const user = await createTestUser(TEST_USERS.alice);

            // Create test posts using helper
            const posts = await createTestPosts(user.id);

            // Create test comments for the first post
            const firstPost = posts.find(post => post.title === 'First Post');
            if (firstPost) {
                await createTestComments(firstPost.id, user.id);
            }
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

                // Use helper to verify embedded user data
                expectEmbeddedUserData(post, TEST_USERS.alice);
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

            // Check embedded comments using helper
            expectEmbeddedCommentsData(postWithComments, 2);
            expectEmbeddedCommentsData(postWithoutComments, 0);
        });
    });
});
