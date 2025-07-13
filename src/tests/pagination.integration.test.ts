import { beforeEach,describe, expect, it } from 'vitest';

import {
    apiRequest,
    createTestUsers,
    expectPaginationHeaders,
    expectSuccessResponse,
    setupTestDatabase
} from './test-helpers';

describe('Pagination', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('Basic Pagination Tests', () => {
        beforeEach(async () => {
            await createTestUsers(15);
        });

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
});
