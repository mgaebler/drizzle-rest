import { getTableColumns } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

// Type for a Drizzle schema object
type DrizzleSchema = Record<string, PgTable | unknown>;

// Type for a Drizzle table column
type DrizzleColumn = PgColumn<any, any, any>;

export interface ColumnMetadata {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    references?: {
        table: string;
        column: string;
    };
}

export interface RelationMetadata {
    type: 'belongs_to' | 'has_many';
    relatedTable: string;
    foreignKey: string;
    relatedColumn: string;
}

export interface TableMetadata {
    name: string;
    tableName: string;
    columns: ColumnMetadata[];
    primaryKey: string[];
    relations: RelationMetadata[];
}

export class SchemaInspector {
    constructor(private schema: DrizzleSchema) { }

    extractTables(): TableMetadata[] {
        const tables = Object.entries(this.schema)
            .filter((entry): entry is [string, PgTable] => this.isTable(entry[1]))
            .map(([name, table]) => this.extractTableMetadata(name, table));

        // Build relations after all tables are extracted
        return tables.map(table => ({
            ...table,
            relations: this.buildTableRelations(table, tables)
        }));
    }

    private isTable(value: unknown): value is PgTable {
        // Check constructor name + additional validation for robust table detection
        if (value?.constructor?.name === 'PgTable') {
            // Additional validation to ensure it's really a PgTable, not just a mock
            const valueAsRecord = value as Record<symbol, unknown>;
            const hasTableSymbol = valueAsRecord[Symbol.for('drizzle:Name')] !== undefined;
            const hasColumnsSymbol = valueAsRecord[Symbol.for('drizzle:Columns')] !== undefined;
            const hasTableConfig = valueAsRecord[Symbol.for('drizzle:Table.Symbol.Config')] !== undefined;

            if (hasTableSymbol && (hasColumnsSymbol || hasTableConfig)) {
                return true;
            }
        }

        return false;
    }

    private extractTableMetadata(name: string, table: PgTable): TableMetadata {
        const columns = this.extractColumns(table);
        const primaryKey = this.extractPrimaryKey(table, columns);
        const tableAsRecord = table as unknown as Record<symbol, unknown>;

        return {
            name,
            tableName: (tableAsRecord[Symbol.for('drizzle:Name')] as string) || name,
            columns,
            primaryKey,
            relations: []
        };
    }

    private extractColumns(table: PgTable): ColumnMetadata[] {
        const drizzleColumns = getTableColumns(table);

        return Object.entries(drizzleColumns).map(([columnName, col]: [string, DrizzleColumn]) => ({
            name: columnName,
            type: this.getColumnType(col),
            nullable: !col.notNull,
            isPrimaryKey: col.primary || false,
            references: this.extractColumnReferences(col)
        }));
    }

    private extractPrimaryKey(table: PgTable, columns: ColumnMetadata[]): string[] {
        // Find columns marked as primary
        const primaryColumns = columns
            .filter(col => col.isPrimaryKey)
            .map(col => col.name);

        // If no explicit primary key found, assume 'id' (with warning)
        if (primaryColumns.length === 0) {
            const hasIdColumn = columns.some(col => col.name === 'id');
            const tableAsRecord = table as unknown as Record<symbol, unknown>;
            const tableName = (tableAsRecord[Symbol.for('drizzle:Name')] as string) || 'unknown';

            if (hasIdColumn) {
                console.warn(`No explicit primary key found for table ${tableName}, assuming 'id' column`);
                return ['id'];
            }
            throw new Error(`No primary key found for table ${tableName}`);
        }

        return primaryColumns;
    }

    private getColumnType(col: DrizzleColumn): string {
        // Extract SQL type from Drizzle column
        if (typeof col.getSQLType === 'function') {
            return col.getSQLType();
        }
        // Fallback
        return col.dataType || 'unknown';
    }

    private extractColumnReferences(col: DrizzleColumn): { table: string; column: string } | undefined {
        // Simple approach: detect foreign keys by naming convention
        // Check both camelCase (userId) and snake_case (user_id) patterns
        const columnName = col.name;
        if (!columnName) return undefined;

        // Pattern 1: camelCase ending with 'Id' (e.g., userId -> user)
        if (columnName.endsWith('Id')) {
            const tableName = columnName.slice(0, -2).toLowerCase(); // Remove 'Id' and make lowercase
            const possibleTableNames = [tableName, tableName + 's'];

            for (const possibleName of possibleTableNames) {
                if (this.schema[possibleName]) {
                    return {
                        table: possibleName,
                        column: 'id'
                    };
                }
            }
        }

        // Pattern 2: snake_case ending with '_id' (e.g., user_id -> user)
        if (columnName.endsWith('_id')) {
            const tableName = columnName.slice(0, -3).toLowerCase(); // Remove '_id' and make lowercase
            const possibleTableNames = [tableName, tableName + 's'];

            for (const possibleName of possibleTableNames) {
                if (this.schema[possibleName]) {
                    return {
                        table: possibleName,
                        column: 'id'
                    };
                }
            }
        }

        return undefined;
    }

    private buildTableRelations(table: TableMetadata, allTables: TableMetadata[]): RelationMetadata[] {
        const relations: RelationMetadata[] = [];

        // Add belongs_to relations for each foreign key column
        table.columns.forEach(column => {
            if (column.references) {
                relations.push({
                    type: 'belongs_to',
                    relatedTable: column.references.table,
                    foreignKey: column.name,
                    relatedColumn: column.references.column
                });
            }
        });

        // Add has_many relations by looking at other tables that reference this table
        allTables.forEach(otherTable => {
            if (otherTable.name === table.name) return;

            otherTable.columns.forEach(column => {
                if (column.references && column.references.table === table.name) {
                    relations.push({
                        type: 'has_many',
                        relatedTable: otherTable.name,
                        foreignKey: column.name,
                        relatedColumn: column.references.column
                    });
                }
            });
        });

        return relations;
    }
}
