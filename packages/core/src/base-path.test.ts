import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { CoreAdapter, type ICoreAdapterOptions } from './core-adapter';

// minimal table
const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name')
});

class TestAdapter extends CoreAdapter { }

function createAdapter(basePath?: string) {
    const options: ICoreAdapterOptions = {
        db: {} as any,
        schema: { users },
        basePath
    } as any;
    return new TestAdapter(options);
}

function makeRequest(path: string, method = 'GET') {
    return new Request(`http://localhost${path}`, { method });
}

describe('CoreAdapter basePath', () => {
    it('defaults to no base path', async () => {
        const adapter = createAdapter();
        // request matching /users should be considered a valid route key (even if handler later fails due to missing implementation details)
        const res = await adapter.handle(makeRequest('/users'));
        // We can't assert exact status (depends on downstream action), but we can ensure not 404 due to path mismatch by allowing 200-500 excluding 404.
        expect(res.status).not.toBe(404);
    });

    it('applies a simple base path', async () => {
        const adapter = createAdapter('/api/v1');
        const resOk = await adapter.handle(makeRequest('/api/v1/users'));
        expect(resOk.status).not.toBe(404);

        const resMissing = await adapter.handle(makeRequest('/users'));
        expect(resMissing.status).toBe(404);
    });

    it('normalizes trailing slash in base path', async () => {
        const adapter = createAdapter('/api/v1/');
        const res = await adapter.handle(makeRequest('/api/v1/users/'));
        // The adapter strips trailing slash from request path
        expect(res.status).not.toBe(404);
    });
});
