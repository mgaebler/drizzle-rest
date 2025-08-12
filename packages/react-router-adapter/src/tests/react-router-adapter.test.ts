import { describe, expect, it } from 'vitest';

// Adjust imports for db and schema as needed for your test setup
import { db } from '../db/connection';
import * as schema from '../db/schema';
import { ReactRouterAdapter } from '../react-router-adapter';

describe('React Router Adapter', () => {
    const adapter = new ReactRouterAdapter({
        db: db as any,
        schema
    });

    describe('Adapter Properties', () => {
        it('should have correct adapter name', () => {
            expect(adapter.name).toBe('react-router');
        });
    });

    describe('Request Parsing', () => {
        it('should parse Request objects without modification', async () => {
            const originalRequest = new Request('http://localhost:3000/api/users', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const parsedRequest = await adapter.parseRequest(originalRequest);

            expect(parsedRequest).toBe(originalRequest);
            expect(parsedRequest.url).toBe('http://localhost:3000/api/users');
            expect(parsedRequest.method).toBe('GET');
            expect(parsedRequest.headers.get('Content-Type')).toBe('application/json');
        });

        it('should handle POST requests with body', async () => {
            const body = JSON.stringify({ name: 'John Doe', email: 'john@example.com' });
            const originalRequest = new Request('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body
            });
            const parsedRequest = await adapter.parseRequest(originalRequest);
            expect(parsedRequest).toBe(originalRequest);
            expect(parsedRequest.method).toBe('POST');
            expect(parsedRequest.headers.get('Content-Type')).toBe('application/json');
        });
    });

    // Add more tests as needed for loader, action, handler, and response conversion
});
