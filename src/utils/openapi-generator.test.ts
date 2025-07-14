import { describe, expect, it } from 'vitest';

import * as schema from '@/db/schema';

import { OpenAPIGenerator } from './openapi-generator';
import { SchemaInspector } from './schema-inspector';

describe('OpenAPI Generator', () => {
    it('should generate basic OpenAPI spec from schema', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();
        const tablesMap = new Map();
        tables.forEach(table => tablesMap.set(table.name, table));

        const generator = new OpenAPIGenerator(tablesMap);
        const spec = generator.generateSpec({
            title: 'Test API',
            version: '1.0.0',
            description: 'Test API description'
        });

        // Basic structure checks
        expect(spec.openapi).toBe('3.0.0');
        expect(spec.info.title).toBe('Test API');
        expect(spec.info.version).toBe('1.0.0');
        expect(spec.info.description).toBe('Test API description');

        // Should have paths for each table
        expect(spec.paths).toBeDefined();
        expect(spec.paths['/users']).toBeDefined();
        expect(spec.paths['/posts']).toBeDefined();
        expect(spec.paths['/comments']).toBeDefined();

        // Should have schemas for each table
        expect(spec.components.schemas).toBeDefined();
        expect(spec.components.schemas.Users).toBeDefined();
        expect(spec.components.schemas.Posts).toBeDefined();
        expect(spec.components.schemas.Comments).toBeDefined();

        // Should have create schemas
        expect(spec.components.schemas.UsersCreate).toBeDefined();
        expect(spec.components.schemas.PostsCreate).toBeDefined();
        expect(spec.components.schemas.CommentsCreate).toBeDefined();
    });

    it('should generate CRUD operations for tables', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();
        const tablesMap = new Map();
        tables.forEach(table => tablesMap.set(table.name, table));

        const generator = new OpenAPIGenerator(tablesMap);
        const spec = generator.generateSpec();

        // Check users endpoints
        const usersCollection = spec.paths['/users'];
        expect(usersCollection.get).toBeDefined(); // GET /users
        expect(usersCollection.post).toBeDefined(); // POST /users

        const usersItem = spec.paths['/users/{id}'];
        expect(usersItem.get).toBeDefined(); // GET /users/{id}
        expect(usersItem.patch).toBeDefined(); // PATCH /users/{id}
        expect(usersItem.put).toBeDefined(); // PUT /users/{id}
        expect(usersItem.delete).toBeDefined(); // DELETE /users/{id}
    });

    it('should respect disabled endpoints', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();
        const tablesMap = new Map();
        tables.forEach(table => tablesMap.set(table.name, table));

        const disabledEndpoints = new Map();
        disabledEndpoints.set('users', ['DELETE', 'CREATE']);

        const generator = new OpenAPIGenerator(tablesMap, disabledEndpoints);
        const spec = generator.generateSpec();

        // Should not have disabled endpoints
        const usersCollection = spec.paths['/users'];
        expect(usersCollection.get).toBeDefined(); // GET should be enabled
        expect(usersCollection.post).toBeUndefined(); // POST should be disabled

        const usersItem = spec.paths['/users/{id}'];
        expect(usersItem.get).toBeDefined(); // GET should be enabled
        expect(usersItem.patch).toBeDefined(); // PATCH should be enabled
        expect(usersItem.put).toBeDefined(); // PUT should be enabled
        expect(usersItem.delete).toBeUndefined(); // DELETE should be disabled
    });

    it('should generate query parameters for filtering', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();
        const tablesMap = new Map();
        tables.forEach(table => tablesMap.set(table.name, table));

        const generator = new OpenAPIGenerator(tablesMap);
        const spec = generator.generateSpec();

        const getUsersOp = spec.paths['/users']?.get;
        expect(getUsersOp).toBeDefined();
        expect(getUsersOp?.parameters).toBeDefined();

        const paramNames = getUsersOp?.parameters?.map(p => p.name) || [];

        // Should have pagination parameters
        expect(paramNames).toContain('_page');
        expect(paramNames).toContain('_per_page');
        expect(paramNames).toContain('_sort');

        // Should have filter parameters for each column
        expect(paramNames).toContain('fullName');
        expect(paramNames).toContain('fullName_like');
        expect(paramNames).toContain('fullName_ne');
        expect(paramNames).toContain('phone');
        expect(paramNames).toContain('phone_like');
        expect(paramNames).toContain('phone_ne');
    });

    it('should generate proper schemas for table columns', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();
        const tablesMap = new Map();
        tables.forEach(table => tablesMap.set(table.name, table));

        const generator = new OpenAPIGenerator(tablesMap);
        const spec = generator.generateSpec();

        const usersSchema = spec.components.schemas.Users;
        expect(usersSchema.type).toBe('object');
        expect(usersSchema.properties).toBeDefined();

        // Check specific properties
        expect(usersSchema.properties?.id).toBeDefined();
        expect(usersSchema.properties?.id.type).toBe('integer');
        expect(usersSchema.properties?.fullName).toBeDefined();
        expect(usersSchema.properties?.fullName.type).toBe('string');
        expect(usersSchema.properties?.fullName.nullable).toBe(true);

        // Create schema should not include auto-generated fields
        const usersCreateSchema = spec.components.schemas.UsersCreate;
        expect(usersCreateSchema.properties?.id).toBeUndefined(); // id is auto-generated
        expect(usersCreateSchema.properties?.fullName).toBeDefined();
        expect(usersCreateSchema.properties?.phone).toBeDefined();
    });
});
