import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { matchRoutes, type RouteObject } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';

import * as schema from '../db/schema';
import { createReactRouterDrizzleRestAdapter } from '../react-router-adapter';

/**
 * Integration test that mimics React Router v7 server framework routing:
 * - Defines a route object with a loader delegating to the adapter handler
 * - Uses matchRoutes() to resolve the route for an incoming Request pathname
 * - Invokes the loader with LoaderFunctionArgs shape and asserts the Response
 */

describe('React Router v7 Server Integration - GET /api/users', () => {
    let handler: any;
    let client: any;

    beforeAll(async () => {
        client = new PGlite();
        const db = drizzle(client);

        // Minimal DDL for required tables (only users needed here)
        await client.exec(`
            CREATE TABLE users (
                id serial PRIMARY KEY,
                full_name text,
                phone text
            );
        `);

        await db.insert(schema.users).values({ fullName: 'Bob Server', phone: '555-0101' });

        const { handler: rrHandler } = createReactRouterDrizzleRestAdapter({ db: db as any, schema, basePath: '/api' });
        handler = rrHandler;
    });

    it('routes request through react-router matchRoutes and returns user list', async () => {
        const request = new Request('http://localhost/api/users', { method: 'GET' });
        const pathname = new URL(request.url).pathname;

        const routes: RouteObject[] = [
            {
                path: 'api/users',
                id: 'api-users',
                loader: async (args: any) => handler(args),
            },
        ];

        const matches = matchRoutes(routes, pathname);
        expect(matches).toBeTruthy();
        expect(matches?.length).toBe(1);

        const match = matches?.[0];
        expect(typeof match.route.loader).toBe('function');
        const response: Response = await (match.route.loader as any)({
            request,
            params: match.params,
            context: {},
        });

        expect(response.status).toBe(200);
        const data: any = await response.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.some((u: any) => u.fullName === 'Bob Server')).toBe(true);
    });

    it('returns 404 for non-existent user id', async () => {
        const request = new Request('http://localhost/api/users/9999', { method: 'GET' });
        const pathname = new URL(request.url).pathname;

        const routes: RouteObject[] = [
            {
                path: 'api/users/:id',
                id: 'api-user',
                loader: async (args: any) => handler(args),
            },
        ];

        const matches = matchRoutes(routes, pathname);
        expect(matches).toBeTruthy();
        const match = matches?.[0];
        expect(typeof match.route.loader).toBe('function');
        const response: Response = await (match.route.loader as any)({
            request,
            params: match.params,
            context: {},
        });

        expect(response.status).toBe(404);
        const body: any = await response.json();
        expect(body).toHaveProperty('error', 'Record not found');
        expect(body).toHaveProperty('requestId');
    });
});
