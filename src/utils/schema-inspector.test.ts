import { describe, it, expect } from 'vitest';
import { SchemaInspector } from './schema-inspector';
import * as schema from '@/db/schema';

describe('SchemaInspector', () => {
    it('should extract table metadata correctly', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();

        const usersTable = tables.find(t => t.name === 'users');
        expect(usersTable).toBeDefined();
        expect(usersTable?.tableName).toBe('users');
        expect(usersTable?.primaryKey).toContain('id'); // Should find 'id' as primary key
        expect(usersTable?.columns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'id',
                    isPrimaryKey: true
                }),
                expect.objectContaining({
                    name: 'fullName'
                }),
                expect.objectContaining({
                    name: 'phone'
                })
            ])
        );
    });

    it('should handle empty schema gracefully', () => {
        const inspector = new SchemaInspector({});
        const tables = inspector.extractTables();
        expect(tables).toHaveLength(0);
    });

    it('should identify primary key correctly', () => {
        const inspector = new SchemaInspector(schema);
        const tables = inspector.extractTables();

        const usersTable = tables[0];
        expect(usersTable.primaryKey).toEqual(['id']);

        const idColumn = usersTable.columns.find(col => col.name === 'id');
        expect(idColumn?.isPrimaryKey).toBe(true);
    });
});
