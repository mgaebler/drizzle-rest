import { getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

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
    constructor(private schema: Record<string, any>) { }

    extractTables(): TableMetadata[] {
        const tables = Object.entries(this.schema)
            .filter(([_, value]) => this.isTable(value))
            .map(([name, table]) => this.extractTableMetadata(name, table));

        // Build relations after all tables are extracted
        return tables.map(table => ({
            ...table,
            relations: this.buildTableRelations(table, tables)
        }));
    }

    private isTable(value: any): boolean {
        // Check if it's a Drizzle table
        return value instanceof PgTable;
    }

    private extractTableMetadata(name: string, table: any): TableMetadata {
        const columns = this.extractColumns(table);
        const primaryKey = this.extractPrimaryKey(table, columns);

        return {
            name,
            tableName: table[Symbol.for('drizzle:Name')] || name,
            columns,
            primaryKey,
            relations: [] // Will be populated later
        };
    }

    private extractColumns(table: any): ColumnMetadata[] {
        const drizzleColumns = getTableColumns(table);

        return Object.entries(drizzleColumns).map(([columnName, col]: [string, any]) => ({
            name: columnName,
            type: this.getColumnType(col),
            nullable: !col.notNull,
            isPrimaryKey: col.primary || false,
            references: this.extractColumnReferences(col)
        }));
    }

    private extractPrimaryKey(table: any, columns: ColumnMetadata[]): string[] {
        // Find columns marked as primary
        const primaryColumns = columns
            .filter(col => col.isPrimaryKey)
            .map(col => col.name);

        // If no explicit primary key found, assume 'id' (with warning)
        if (primaryColumns.length === 0) {
            const hasIdColumn = columns.some(col => col.name === 'id');
            if (hasIdColumn) {
                console.warn(`No explicit primary key found for table ${table[Symbol.for('drizzle:Name')]}, assuming 'id' column`);
                return ['id'];
            }
            throw new Error(`No primary key found for table ${table[Symbol.for('drizzle:Name')]}`);
        }

        return primaryColumns;
    }

    private getColumnType(col: any): string {
        // Extract SQL type from Drizzle column
        if (typeof col.getSQLType === 'function') {
            return col.getSQLType();
        }
        // Fallback
        return col.dataType || 'unknown';
    }

    private extractColumnReferences(col: any): { table: string; column: string } | undefined {
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

    private extractRelations(tableName: string, columns: ColumnMetadata[]): RelationMetadata[] {
        const relations: RelationMetadata[] = [];

        // Add belongs_to relations for each foreign key column
        columns.forEach(column => {
            if (column.references) {
                relations.push({
                    type: 'belongs_to',
                    relatedTable: column.references.table,
                    foreignKey: column.name,
                    relatedColumn: column.references.column
                });
            }
        });

        return relations;
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

    private getRelationName(columnOrTable: string, relatedTable: string, isPlural = false): string {
        // Simple naming convention: remove 'Id' suffix for belongs_to, pluralize for has_many
        if (isPlural) {
            return relatedTable.endsWith('s') ? relatedTable : relatedTable + 's';
        }
        return columnOrTable.replace(/Id$/, '').toLowerCase();
    }
}
