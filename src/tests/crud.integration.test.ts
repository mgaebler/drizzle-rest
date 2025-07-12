import { describe, it, expect, beforeEach } from 'vitest';
import {
    apiRequest,
    TEST_USERS,
    createTestUser,
    createTestUsers,
    expectSuccessResponse,
    expectUserProperties,
    setupTestDatabase
} from './test-helpers';

describe('CRUD Operations', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('Basic CRUD Operations', () => {
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
    });
});
