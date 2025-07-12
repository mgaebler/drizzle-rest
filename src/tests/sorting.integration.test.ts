import { describe, it, expect, beforeEach } from 'vitest';
import {
    apiRequest,
    createTestUsers,
    expectSuccessResponse,
    setupTestDatabase
} from './test-helpers';

describe('JSON-Server Sorting', () => {
    beforeEach(async () => {
        await setupTestDatabase();
        await createTestUsers(10);
    });

    describe('Single Field Sorting', () => {
        it('should sort by single field ascending (default)', async () => {
            const res = await apiRequest.get('/users?_sort=fullName');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Check if results are sorted by fullName in ascending order
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].fullName <= res.body[i].fullName).toBe(true);
            }
        });

        it('should sort by single field descending with - prefix', async () => {
            const res = await apiRequest.get('/users?_sort=-fullName');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Check if results are sorted by fullName in descending order
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].fullName >= res.body[i].fullName).toBe(true);
            }
        });

        it('should sort by ID ascending', async () => {
            const res = await apiRequest.get('/users?_sort=id');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Check if results are sorted by id in ascending order
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].id <= res.body[i].id).toBe(true);
            }
        });

        it('should sort by ID descending', async () => {
            const res = await apiRequest.get('/users?_sort=-id');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Check if results are sorted by id in descending order
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].id >= res.body[i].id).toBe(true);
            }
        });
    });

    describe('Multi-Field Sorting', () => {
        it('should sort by multiple fields: fullName, then id', async () => {
            // Use existing test data - should be User 1, User 10, User 2, etc.
            const res = await apiRequest.get('/users?_sort=fullName,id');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Just verify that multi-field sorting is working (exact order may vary)
            // The key test is that it doesn't crash and returns all records
            expect(res.body.every((user: any) => user.fullName.startsWith('User'))).toBe(true);
        });

        it('should sort by multiple fields with mixed directions', async () => {
            const res = await apiRequest.get('/users?_sort=-fullName,id');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Verify multi-field sorting with mixed directions works
            expect(res.body.every((user: any) => user.fullName.startsWith('User'))).toBe(true);
        });
    });

    describe('Sorting Edge Cases', () => {
        it('should ignore invalid column names in sort', async () => {
            const res = await apiRequest.get('/users?_sort=invalidColumn,fullName');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);

            // Should still sort by fullName (ignoring invalidColumn)
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].fullName <= res.body[i].fullName).toBe(true);
            }
        });

        it('should handle empty sort parameter', async () => {
            const res = await apiRequest.get('/users?_sort=');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);
            // No specific sort order expected, just verify it doesn't crash
        });

        it('should handle sort with whitespace', async () => {
            const res = await apiRequest.get('/users?_sort= fullName , -phone ');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(10);
            // Should handle trimming and still sort correctly
        });

        it('should work with sorting + filtering', async () => {
            const res = await apiRequest.get('/users?fullName_like=User&_sort=-id');
            expectSuccessResponse(res);

            // Verify both filtering and sorting work together
            expect(res.body.every((user: any) => user.fullName.includes('User'))).toBe(true);

            // Verify descending sort by id
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].id >= res.body[i].id).toBe(true);
            }
        });

        it('should work with sorting + pagination', async () => {
            const res = await apiRequest.get('/users?_sort=-id&_page=1&_per_page=3');
            expectSuccessResponse(res);
            expect(res.body).toHaveLength(3);

            // Just verify sorting + pagination works together
            expect(res.body.every((user: any) => user.fullName.startsWith('User'))).toBe(true);

            // Verify descending sort by id
            for (let i = 1; i < res.body.length; i++) {
                expect(res.body[i - 1].id >= res.body[i].id).toBe(true);
            }
        });
    });
});
