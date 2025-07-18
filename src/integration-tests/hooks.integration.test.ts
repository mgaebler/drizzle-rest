import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/connection';
import * as schema from '@/db/schema.js';
import { HookContext } from '@/utils/hook-context';

import { createDrizzleRestAdapter } from '../drizzle-rest-adapter';
import { setupTestDatabase, TEST_USERS } from './test-helpers';

// Mock user for testing authorization
const mockUser = {
    id: 1,
    role: 'user',
    fullName: 'Mock User'
};

const mockAdminUser = {
    id: 2,
    role: 'admin',
    fullName: 'Mock Admin'
};

// Helper to create app with auth middleware and hooks
const createAppWithHooks = (tableOptions: any = {}) => {
    const app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
        // Default to regular user, tests can override this
        (req as any).user = mockUser;
        next();
    });

    const drizzleApiRouter = createDrizzleRestAdapter({
        db: db,
        schema: schema,
        tableOptions,
    });

    app.use('/api/v1', drizzleApiRouter);
    return app;
};

// Helper to create app with admin user
const createAppWithAdminUser = (tableOptions: any = {}) => {
    const app = express();
    app.use(express.json());

    // Mock authentication middleware with admin user
    app.use((req, res, next) => {
        (req as any).user = mockAdminUser;
        next();
    });

    const drizzleApiRouter = createDrizzleRestAdapter({
        db: db,
        schema: schema,
        tableOptions,
    });

    app.use('/api/v1', drizzleApiRouter);
    return app;
};

describe('Hook System Integration Tests', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('beforeOperation hooks', () => {
        it('should call beforeOperation hook before CREATE operation', async () => {
            const beforeOperationSpy = vi.fn();

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: beforeOperationSpy
                    }
                }
            });

            await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(beforeOperationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    req: expect.objectContaining({
                        user: mockUser
                    }),
                    operation: 'CREATE',
                    table: 'users',
                    record: TEST_USERS.alice,
                    metadata: expect.objectContaining({
                        tableName: 'users',
                        primaryKey: 'id',
                        columns: expect.arrayContaining(['id', 'fullName', 'phone'])
                    })
                })
            );
        });

        it('should block operation when beforeOperation hook throws error', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: HookContext) => {
                            throw new Error('Forbidden: Cannot create users');
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden: Cannot create users');
        });
    });

    describe('afterOperation hooks', () => {
        it('should call afterOperation hook after CREATE operation', async () => {
            const afterOperationSpy = vi.fn().mockImplementation((_context: HookContext, result: any) => result);

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        afterOperation: afterOperationSpy
                    }
                }
            });

            await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(afterOperationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    req: expect.objectContaining({
                        user: mockUser
                    }),
                    operation: 'CREATE',
                    table: 'users',
                    record: TEST_USERS.alice,
                    metadata: expect.objectContaining({
                        tableName: 'users',
                        primaryKey: 'id'
                    })
                }),
                expect.objectContaining({
                    id: expect.any(Number),
                    fullName: TEST_USERS.alice.fullName,
                    phone: TEST_USERS.alice.phone
                })
            );
        });

        it('should modify result when afterOperation hook returns modified data', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        afterOperation: async (context: HookContext, result: any) => {
                            if (context.operation === 'CREATE') {
                                return {
                                    ...result,
                                    fullName: 'Modified Name',
                                    customField: 'Added by hook'
                                };
                            }
                            return result;
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(201);
            expect(res.body.fullName).toBe('Modified Name');
            expect(res.body.customField).toBe('Added by hook');
        });

        it('should filter sensitive data in afterOperation hook', async () => {
            // Create a test user first
            const [testUser] = await db.insert(schema.users).values(TEST_USERS.alice).returning();

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        afterOperation: async (context: HookContext, result: any) => {
                            if (context.req.user?.role !== 'admin') {
                                // Remove sensitive data for non-admin users
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { phone, ...filteredResult } = result;
                                return filteredResult;
                            }
                            return result;
                        }
                    }
                }
            });

            const res = await request(app)
                .get(`/api/v1/users/${testUser.id}`);

            expect(res.status).toBe(200);
            expect(res.body.fullName).toBe(TEST_USERS.alice.fullName);
            expect(res.body.phone).toBeUndefined(); // Should be filtered out
        });

        it('should not filter sensitive data for admin users', async () => {
            // Create a test user first
            const [testUser] = await db.insert(schema.users).values(TEST_USERS.alice).returning();

            const app = createAppWithAdminUser({
                users: {
                    hooks: {
                        afterOperation: async (context: HookContext, result: any) => {
                            if (context.req.user?.role !== 'admin') {
                                // Remove sensitive data for non-admin users
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                const { phone, ...filteredResult } = result;
                                return filteredResult;
                            }
                            return result;
                        }
                    }
                }
            });

            const res = await request(app)
                .get(`/api/v1/users/${testUser.id}`);

            expect(res.status).toBe(200);
            expect(res.body.fullName).toBe(TEST_USERS.alice.fullName);
            expect(res.body.phone).toBe(TEST_USERS.alice.phone); // Should be included for admin
        });
    });

    describe('Authorization scenarios', () => {
        it('should allow admin to delete users', async () => {
            // Create a test user first
            const [testUser] = await db.insert(schema.users).values(TEST_USERS.alice).returning();

            const app = createAppWithAdminUser({
                users: {
                    hooks: {
                        beforeOperation: async (context: HookContext) => {
                            if (context.operation === 'DELETE' && context.req.user.role !== 'admin') {
                                throw new Error('Forbidden: Only admins can delete users');
                            }
                        }
                    }
                }
            });

            const res = await request(app)
                .delete(`/api/v1/users/${testUser.id}`);

            expect(res.status).toBe(204);
        });

        it('should prevent non-admin from deleting users', async () => {
            // Create a test user first
            const [testUser] = await db.insert(schema.users).values(TEST_USERS.alice).returning();

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (context: HookContext) => {
                            if (context.operation === 'DELETE' && context.req.user.role !== 'admin') {
                                throw new Error('Forbidden: Only admins can delete users');
                            }
                        }
                    }
                }
            });

            const res = await request(app)
                .delete(`/api/v1/users/${testUser.id}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden: Only admins can delete users');
        });

        it('should auto-set author in beforeOperation hook for CREATE operations', async () => {
            let capturedRecord: any = null;

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (context: HookContext) => {
                            if (context.operation === 'CREATE') {
                                // Auto-set createdBy to current user
                                context.record.createdBy = context.req.user?.id;
                                capturedRecord = context.record;
                            }
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(201);
            expect(capturedRecord).toEqual({
                ...TEST_USERS.alice,
                createdBy: mockUser.id
            });
        });
    });

    describe('Error handling', () => {
        it('should handle async errors in beforeOperation hooks', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: HookContext) => {
                            await new Promise(resolve => setTimeout(resolve, 10));
                            throw new Error('Async error in beforeOperation');
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Async error in beforeOperation');
        });

        it('should handle async errors in afterOperation hooks', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        afterOperation: async (_context: HookContext, _result: any) => {
                            await new Promise(resolve => setTimeout(resolve, 10));
                            throw new Error('Async error in afterOperation');
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Async error in afterOperation');
        });

        it('should handle non-Error objects thrown from hooks', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: HookContext) => {
                            throw 'String error';
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('String error');
        });
    });

    describe('Hook execution order', () => {
        it('should execute beforeOperation before afterOperation', async () => {
            const executionOrder: string[] = [];

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: HookContext) => {
                            executionOrder.push('beforeOperation');
                        },
                        afterOperation: async (_context: HookContext, result: any) => {
                            executionOrder.push('afterOperation');
                            return result;
                        }
                    }
                }
            });

            await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(executionOrder).toEqual(['beforeOperation', 'afterOperation']);
        });

        it('should not execute afterOperation if beforeOperation throws', async () => {
            const executionOrder: string[] = [];

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: HookContext) => {
                            executionOrder.push('beforeOperation');
                            throw new Error('Before operation error');
                        },
                        afterOperation: async (_context: HookContext, result: any) => {
                            executionOrder.push('afterOperation');
                            return result;
                        }
                    }
                }
            });

            await request(app)
                .post('/api/v1/users')
                .send(TEST_USERS.alice);

            expect(executionOrder).toEqual(['beforeOperation']);
        });
    });
});
