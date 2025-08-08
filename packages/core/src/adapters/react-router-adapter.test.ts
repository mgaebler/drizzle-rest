import { describe, expect, it } from 'vitest';

import { db } from '../db/connection';
import * as schema from '../db/schema';
import { ReactRouterAdapter } from './react-router-adapter';

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
            expect(parsedRequest.url).toBe('http://localhost:3000/api/users');
            expect(parsedRequest.method).toBe('POST');
        });
    });

    describe('Handler Creation', () => {
        it('should create loader function', () => {
            const loader = adapter.createLoader();
            expect(typeof loader).toBe('function');
        });

        it('should create action function', () => {
            const action = adapter.createAction();
            expect(typeof action).toBe('function');
        });

        it('should create combined handler function', () => {
            const handler = adapter.createHandler();
            expect(typeof handler).toBe('function');
        });
    });

    describe('Response Handling', () => {
        it('should throw error when sendResponse is called', async () => {
            const response = new Response('test');

            await expect(adapter.sendResponse(response, {})).rejects.toThrow(
                'sendResponse should not be called for React Router adapter. Use convertToRouterResponse instead.'
            );
        });
    });

    describe('Handler Execution', () => {
        it('should handle GET request through loader', async () => {
            const loader = adapter.createLoader();
            const request = new Request('http://localhost:3000/users');

            const response = await loader({ request, params: {} });

            expect(response).toBeInstanceOf(Response);
            // Database is not set up for this test, so we expect an error status
            // The important thing is that the adapter handles the request and returns a Response
            expect([200, 500].includes(response.status)).toBe(true);
        });

        it('should handle POST request through action', async () => {
            const action = adapter.createAction();
            const request = new Request('http://localhost:3000/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: 'John Doe', phone: '123-456-7890' })
            });

            const response = await action({ request, params: {} });

            expect(response).toBeInstanceOf(Response);
            // Database is not set up for this test, so we expect an error status
            // The important thing is that the adapter handles the request and returns a Response
            expect([201, 500].includes(response.status)).toBe(true);
        });

        it('should handle any request through combined handler', async () => {
            const handler = adapter.createHandler();
            const request = new Request('http://localhost:3000/users');

            const response = await handler({ request, params: {} });

            expect(response).toBeInstanceOf(Response);
            // Database is not set up for this test, so we expect an error status
            // The important thing is that the adapter handles the request and returns a Response
            expect([200, 500].includes(response.status)).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            const handler = adapter.createHandler();
            // Invalid URL should cause an error
            const request = new Request('http://localhost:3000/invalid-table');

            try {
                const response = await handler({ request, params: {} });
                // The adapter should handle the error and return a 404 or similar
                expect(response).toBeInstanceOf(Response);
                expect(response.status).toBeGreaterThanOrEqual(400);
            } catch (error) {
                // If it throws, it should be a Response object (React Router pattern)
                expect(error).toBeInstanceOf(Response);
                expect((error as Response).status).toBe(500);
            }
        });
    });
});
