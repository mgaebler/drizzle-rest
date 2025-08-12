import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../db/connection';
import * as schema from '../db/schema.js';
import { createExpressDrizzleRestAdapter } from '../index';
import { createTestAdapterOptions, setupTestDatabase, TEST_USERS } from './test-helpers';

// Example permission lists for different user types
const userPermissions = [
    "users:read", "users:update",
    "comments:read", "comments:create", "comments:update",
    "posts:read"
];

const editorPermissions = [
    "users:read", "users:update",
    "comments:read", "comments:create", "comments:update", "comments:delete",
    "posts:read", "posts:create", "posts:update", "posts:write",
    "categories:read"
];

const adminPermissions = [
    "users:read", "users:write", "users:delete", "users:create", "users:update",
    "comments:read", "comments:write", "comments:delete", "comments:create", "comments:update",
    "posts:read", "posts:write", "posts:delete", "posts:create", "posts:update",
    "categories:read", "categories:write", "categories:delete", "categories:create", "categories:update",
    "tags:read", "tags:write", "tags:delete", "tags:create", "tags:update"
];

// Mock users with permission-based authorization
const mockUser = {
    id: 1,
    role: 'user',
    fullName: 'Mock User',
    permissions: userPermissions
};

const mockEditorUser = {
    id: 2,
    role: 'editor',
    fullName: 'Mock Editor',
    permissions: editorPermissions
};

const mockAdminUser = {
    id: 3,
    role: 'admin',
    fullName: 'Mock Admin',
    permissions: adminPermissions
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

    const drizzleApiRouter = createExpressDrizzleRestAdapter(createTestAdapterOptions(tableOptions));

    app.use('', drizzleApiRouter);
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

    const drizzleApiRouter = createExpressDrizzleRestAdapter(createTestAdapterOptions(tableOptions));

    app.use('', drizzleApiRouter);
    return app;
};

describe.skip('Hook System Integration Tests', () => {
    beforeEach(async () => {
        await setupTestDatabase();
    });

    describe('beforeOperation hooks', () => {
        it('should call beforeOperation hook before CREATE action', async () => {
            const beforeOperationSpy = vi.fn();

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: beforeOperationSpy
                    }
                }
            });

            await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(beforeOperationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    req: expect.objectContaining({
                        user: mockUser
                    }),
                    action: 'CREATE',
                    table: 'users',
                    record: TEST_USERS.alice
                })
            );
        });

        it('should block action when beforeOperation hook throws error', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: any) => {
                            throw new Error('Forbidden: Cannot create users');
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden: Cannot create users');
        });
    });

    describe('afterOperation hooks', () => {
        it('should call afterOperation hook after CREATE action', async () => {
            const afterOperationSpy = vi.fn().mockImplementation((_context: any, result: any) => result);

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        afterOperation: afterOperationSpy
                    }
                }
            });

            await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(afterOperationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    req: expect.objectContaining({
                        user: mockUser
                    }),
                    action: 'CREATE',
                    table: 'users',
                    record: TEST_USERS.alice
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
                        afterOperation: async (context: any, result: any) => {
                            if (context.action === 'CREATE') {
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
                .post('/users')
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
                        afterOperation: async (context: any, result: any) => {
                            if (context.req.user?.role !== 'admin') {
                                // Remove sensitive data for non-admin users

                                const { ...filteredResult } = result;
                                return filteredResult;
                            }
                            return result;
                        }
                    }
                }
            });

            const res = await request(app)
                .get(`/users/${testUser.id}`);

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
                        afterOperation: async (context: any, result: any) => {
                            if (context.req.user?.role !== 'admin') {
                                // Remove sensitive data for non-admin users

                                const { ...filteredResult } = result;
                                return filteredResult;
                            }
                            return result;
                        }
                    }
                }
            });

            const res = await request(app)
                .get(`/users/${testUser.id}`);

            expect(res.status).toBe(200);
            expect(res.body.fullName).toBe(TEST_USERS.alice.fullName);
            expect(res.body.phone).toBe(TEST_USERS.alice.phone); // Should be included for admin
        });
    });

    describe('Permission-based authorization', () => {
        // Helper function to check if user has permission
        const hasPermission = (user: any, permission: string): boolean => {
            return user?.permissions?.includes(permission) || false;
        };

        // Helper function to get required permission for action
        const getRequiredPermission = (table: string, action: string): string => {
            const actionMap: Record<string, string> = {
                'CREATE': 'create',
                'GET_ONE': 'read',
                'GET_MANY': 'read',
                'UPDATE': 'update',
                'REPLACE': 'write',
                'DELETE': 'delete'
            };
            return `${table}:${actionMap[action]}`;
        };

        it('should allow user with correct permissions to perform action', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = getRequiredPermission(context.table, context.action);
                            if (!hasPermission(context.req.user, requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            });

            // User has "users:read" permission
            const res = await request(app)
                .get('/users');

            expect(res.status).toBe(200);
        });

        it('should block user without correct permissions', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = getRequiredPermission(context.table, context.action);
                            if (!hasPermission(context.req.user, requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            });

            // User does NOT have "users:delete" permission
            const res = await request(app)
                .delete('/users/1');

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden: Missing permission users:delete');
        });

        it('should allow admin with full permissions to perform any action', async () => {
            const app = createAppWithAdminUser({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = getRequiredPermission(context.table, context.action);
                            if (!hasPermission(context.req.user, requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            });

            // Admin has "users:delete" permission
            const res = await request(app)
                .delete('/users/1');

            expect(res.status).toBe(404); // 404 because user doesn't exist, but permission passed
        });

        it('should demonstrate editor permissions for posts', async () => {
            const appWithEditor = express();
            appWithEditor.use(express.json());

            // Mock authentication middleware with editor user
            appWithEditor.use((req, res, next) => {
                (req as any).user = mockEditorUser;
                next();
            });

            const drizzleApiRouter = createExpressDrizzleRestAdapter(createTestAdapterOptions({
                posts: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = getRequiredPermission(context.table, context.action);
                            if (!hasPermission(context.req.user, requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            }));

            appWithEditor.use('', drizzleApiRouter);

            // Editor has "posts:read" permission
            const readRes = await request(appWithEditor)
                .get('/posts');
            expect(readRes.status).toBe(200);

            // Editor has "posts:create" permission
            const createRes = await request(appWithEditor)
                .post('/posts')
                .send({ title: 'Test Post', content: 'Test content' });
            expect(createRes.status).not.toBe(403); // Should not be forbidden due to permissions
        });

        it('should demonstrate granular permission control', async () => {
            // Create a user with very specific permissions
            const limitedUser = {
                id: 4,
                role: 'limited',
                fullName: 'Limited User',
                permissions: ['posts:read', 'comments:read'] // Only read permissions
            };

            const appWithLimitedUser = express();
            appWithLimitedUser.use(express.json());
            appWithLimitedUser.use((req, res, next) => {
                (req as any).user = limitedUser;
                next();
            });

            const drizzleApiRouter = createExpressDrizzleRestAdapter(createTestAdapterOptions({
                posts: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = getRequiredPermission(context.table, context.action);
                            if (!hasPermission(context.req.user, requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                },
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = getRequiredPermission(context.table, context.action);
                            if (!hasPermission(context.req.user, requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            }));

            appWithLimitedUser.use('', drizzleApiRouter);

            // Limited user can read posts
            const postsRes = await request(appWithLimitedUser)
                .get('/posts');
            expect(postsRes.status).toBe(200);

            // Limited user cannot read users (no users:read permission)
            const usersRes = await request(appWithLimitedUser)
                .get('/users');
            expect(usersRes.status).toBe(403);
            expect(usersRes.body.error).toBe('Forbidden: Missing permission users:read');

            // Limited user cannot create posts (no posts:create permission)
            const createRes = await request(appWithLimitedUser)
                .post('/posts')
                .send({ title: 'Test', content: 'Test' });
            expect(createRes.status).toBe(403);
            expect(createRes.body.error).toBe('Forbidden: Missing permission posts:create');
        });
    });

    describe('Authorization scenarios', () => {
        it('should allow admin to delete users with permission-based auth', async () => {
            // Create a test user first
            const [testUser] = await db.insert(schema.users).values(TEST_USERS.alice).returning();

            const app = createAppWithAdminUser({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = `${context.table}:delete`;
                            if (!context.req.user.permissions?.includes(requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            });

            const res = await request(app)
                .delete(`/users/${testUser.id}`);

            expect(res.status).toBe(204);
        });

        it('should prevent non-admin from deleting users with permission-based auth', async () => {
            // Create a test user first
            const [testUser] = await db.insert(schema.users).values(TEST_USERS.alice).returning();

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            const requiredPermission = `${context.table}:delete`;
                            if (!context.req.user.permissions?.includes(requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }
                        }
                    }
                }
            });

            const res = await request(app)
                .delete(`/users/${testUser.id}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden: Missing permission users:delete');
        });

        it('should auto-set author and check permissions in beforeOperation hook', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            // Check permissions first
                            const requiredPermission = `${context.table}:create`;
                            if (!context.req.user.permissions?.includes(requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }

                            // Auto-set createdBy to current user
                            if (context.action === 'CREATE') {
                                context.record.createdBy = context.req.user?.id;
                            }
                        }
                    }
                }
            });

            // User does NOT have "users:create" permission, so this should fail
            const res = await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Forbidden: Missing permission users:create');
        });

        it('should auto-set author when user has correct permissions', async () => {
            let capturedRecord: any = null;

            // Create a user with create permissions
            const userWithCreatePermission = {
                ...mockUser,
                permissions: [...userPermissions, 'users:create']
            };

            const app = express();
            app.use(express.json());
            app.use((req, res, next) => {
                (req as any).user = userWithCreatePermission;
                next();
            });

            const drizzleApiRouter = createExpressDrizzleRestAdapter(createTestAdapterOptions({
                users: {
                    hooks: {
                        beforeOperation: async (context: any) => {
                            // Check permissions first
                            const requiredPermission = `${context.table}:create`;
                            if (!context.req.user.permissions?.includes(requiredPermission)) {
                                throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
                            }

                            // Auto-set createdBy to current user
                            if (context.action === 'CREATE') {
                                context.record.createdBy = context.req.user?.id;
                                capturedRecord = context.record;
                            }
                        }
                    }
                }
            }));

            app.use('', drizzleApiRouter);

            const res = await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(201);
            expect(capturedRecord).toEqual({
                ...TEST_USERS.alice,
                createdBy: userWithCreatePermission.id
            });
        });
    });

    describe('Error handling', () => {
        it('should handle async errors in beforeOperation hooks', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: any) => {
                            await new Promise(resolve => setTimeout(resolve, 10));
                            throw new Error('Async error in beforeOperation');
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Async error in beforeOperation');
        });

        it('should handle async errors in afterOperation hooks', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        afterOperation: async (_context: any, _result: any) => {
                            await new Promise(resolve => setTimeout(resolve, 10));
                            throw new Error('Async error in afterOperation');
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Async error in afterOperation');
        });

        it('should handle non-Error objects thrown from hooks', async () => {
            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: any) => {
                            throw 'String error';
                        }
                    }
                }
            });

            const res = await request(app)
                .post('/users')
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
                        beforeOperation: async (_context: any) => {
                            executionOrder.push('beforeOperation');
                        },
                        afterOperation: async (_context: any, result: any) => {
                            executionOrder.push('afterOperation');
                            return result;
                        }
                    }
                }
            });

            await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(executionOrder).toEqual(['beforeOperation', 'afterOperation']);
        });

        it('should not execute afterOperation if beforeOperation throws', async () => {
            const executionOrder: string[] = [];

            const app = createAppWithHooks({
                users: {
                    hooks: {
                        beforeOperation: async (_context: any) => {
                            executionOrder.push('beforeOperation');
                            throw new Error('Before action error');
                        },
                        afterOperation: async (_context: any, result: any) => {
                            executionOrder.push('afterOperation');
                            return result;
                        }
                    }
                }
            });

            await request(app)
                .post('/users')
                .send(TEST_USERS.alice);

            expect(executionOrder).toEqual(['beforeOperation']);
        });
    });
});
