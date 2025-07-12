import { asc, desc, and } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { FilterBuilder } from './filter-builder';
import { EmbedBuilder } from './embed-builder';
import { ParsedQueryParams } from './query-parser';
import { TableMetadata } from './schema-inspector';

type DrizzleDb = any; // Using generic type for compatibility

export class QueryBuilder {
    private filterBuilder: FilterBuilder;
    private embedBuilder: EmbedBuilder;

    constructor(
        private db: DrizzleDb,
        private table: PgTable,
        private columns: Record<string, any>,
        private schema: Record<string, any>,
        private tablesMetadata: Map<string, TableMetadata>,
        private tableName: string
    ) {
        this.filterBuilder = new FilterBuilder(columns);
        this.embedBuilder = new EmbedBuilder(db, schema, tablesMetadata);
    }

    buildSelectQuery(params: ParsedQueryParams) {
        const query = this.db.select().from(this.table).$dynamic();

        // Apply filters
        const whereConditions = this.filterBuilder.buildWhereConditions(params.filters);
        if (whereConditions.length > 0) {
            query.where(and(...whereConditions));
        }

        // Apply sorting
        if (params.sort && params.sort.length > 0) {
            const orderByExpressions = params.sort
                .filter(sortField => this.columns[sortField.column]) // Only sort by valid columns
                .map(sortField => {
                    const sortFn = sortField.order === 'desc' ? desc : asc;
                    return sortFn(this.columns[sortField.column]);
                });

            if (orderByExpressions.length > 0) {
                query.orderBy(...orderByExpressions);
            }
        }

        // Apply pagination
        const { limit, offset } = this.calculatePagination(params.pagination);
        query.limit(limit).offset(offset);

        return { query, whereConditions, embedKeys: params.embed };
    }

    async getTotalCount(filters: Record<string, any>): Promise<number> {
        const countQuery = this.db.select().from(this.table).$dynamic();

        const whereConditions = this.filterBuilder.buildWhereConditions(filters);
        if (whereConditions.length > 0) {
            countQuery.where(and(...whereConditions));
        }

        const totalRecords = await countQuery;
        return totalRecords.length;
    }

    async applyEmbeds(data: any[], embedKeys?: string[]): Promise<any[]> {
        if (!embedKeys || embedKeys.length === 0) {
            return data;
        }

        return await this.embedBuilder.applyEmbeds(data, this.tableName, embedKeys);
    }

    private calculatePagination(pagination: ParsedQueryParams['pagination']) {
        const { page, perPage, start, end, limit } = pagination;

        // Prioritize range pagination over page-based pagination
        if (start !== undefined && end !== undefined) {
            // Range pagination with start and end (exclusive end)
            const startIndex = Math.max(0, start);
            const endIndex = Math.max(startIndex, end);
            return {
                limit: endIndex - startIndex,
                offset: startIndex,
            };
        }

        if (start !== undefined && limit !== undefined) {
            // Range pagination with start and limit
            const startIndex = Math.max(0, start);
            const limitValue = Math.max(0, limit);
            return {
                limit: limitValue,
                offset: startIndex,
            };
        }

        // Default page-based pagination
        const limitValue = Math.max(1, perPage);
        const offset = Math.max(0, (page - 1) * limitValue);
        return {
            limit: limitValue,
            offset,
        };
    }
}
