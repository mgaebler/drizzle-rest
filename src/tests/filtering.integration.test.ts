import { describe, it, expect, beforeEach } from 'vitest';
import {
    apiRequest,
    TEST_USERS,
    createTestUser,
    createFilteringTestData,
    expectSuccessResponse,
    expectFilterResults,
    setupTestDatabase
} from './test-helpers';

describe('JSON-Server Filtering', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('JSON-Server Filtering Tests', () => {
        beforeEach(async () => {
            await createFilteringTestData();
        });

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
                const res = await apiRequest.get('/users?fullName_like=Alice&_sort=-fullName');
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
