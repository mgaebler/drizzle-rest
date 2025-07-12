import { eq, ne, like, inArray, gte, lte, and } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export class FilterBuilder {
    constructor(private columns: Record<string, any>) { }

    buildWhereConditions(filters: Record<string, any>): any[] {
        const whereConditions: any[] = [];

        for (const [key, value] of Object.entries(filters)) {
            const condition = this.buildCondition(key, value);
            if (condition) {
                whereConditions.push(condition);
            }
        }

        return whereConditions;
    }

    private buildCondition(key: string, value: any): any | null {
        // Handle JSON-Server filtering operators
        if (key.endsWith('_like')) {
            return this.buildLikeCondition(key, value);
        }

        if (key.endsWith('_ne')) {
            return this.buildNotEqualCondition(key, value);
        }

        if (key.endsWith('_gte')) {
            return this.buildGreaterThanEqualCondition(key, value);
        }

        if (key.endsWith('_lte')) {
            return this.buildLessThanEqualCondition(key, value);
        }

        // Direct equality or array membership
        if (this.columns[key]) {
            return this.buildEqualityCondition(key, value);
        }

        return null;
    }

    private buildLikeCondition(key: string, value: any): any | null {
        const columnName = key.replace('_like', '');
        if (!this.columns[columnName]) return null;

        return like(this.columns[columnName], `%${value}%`);
    }

    private buildNotEqualCondition(key: string, value: any): any | null {
        const columnName = key.replace('_ne', '');
        if (!this.columns[columnName]) return null;

        return ne(this.columns[columnName], value);
    }

    private buildGreaterThanEqualCondition(key: string, value: any): any | null {
        const columnName = key.replace('_gte', '');
        if (!this.columns[columnName]) return null;

        return gte(this.columns[columnName], value);
    }

    private buildLessThanEqualCondition(key: string, value: any): any | null {
        const columnName = key.replace('_lte', '');
        if (!this.columns[columnName]) return null;

        return lte(this.columns[columnName], value);
    }

    private buildEqualityCondition(key: string, value: any): any {
        if (Array.isArray(value)) {
            // Handle multiple values for the same parameter (array membership)
            return inArray(this.columns[key], value);
        }

        if (typeof value === 'string' && value.includes(',')) {
            // Handle comma-separated values as array
            const values = value.split(',').map(v => v.trim());
            return inArray(this.columns[key], values);
        }

        // Single value equality
        return eq(this.columns[key], value);
    }
}
