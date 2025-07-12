import { getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export interface ColumnMetadata {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
}

export interface TableMetadata {
    name: string;
    tableName: string;
    columns: ColumnMetadata[];
    primaryKey: string[];
}

export class SchemaInspector {
    constructor(private schema: Record<string, any>) { }

    extractTables(): TableMetadata[] {
        return Object.entries(this.schema)
            .filter(([_, value]) => this.isTable(value))
            .map(([name, table]) => this.extractTableMetadata(name, table));
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
            primaryKey
        };
    }

    private extractColumns(table: any): ColumnMetadata[] {
        const drizzleColumns = getTableColumns(table);

        return Object.entries(drizzleColumns).map(([columnName, col]: [string, any]) => ({
            name: columnName,
            type: this.getColumnType(col),
            nullable: !col.notNull,
            isPrimaryKey: col.primary || false
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
}
