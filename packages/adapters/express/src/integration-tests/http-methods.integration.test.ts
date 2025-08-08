import request from 'supertest';
import { beforeEach,describe, expect, it } from 'vitest';

import { app, setupTestDatabase } from './test-helpers';

describe('HTTP Methods', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('PUT Method Tests', () => {
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
});
