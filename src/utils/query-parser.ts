import { Request } from 'express';

export interface ParsedQueryParams {
    pagination: {
        page: number;
        perPage: number;
        start?: number;
        end?: number;
        limit?: number;
    };
    sort?: Array<{
        column: string;
        order: 'asc' | 'desc';
    }>;
    filters: Record<string, any>;
    embed?: string[];
}

export class QueryParser {
    private static readonly EXCLUDE_PARAMS = ['_page', '_per_page', '_sort', '_start', '_end', '_limit', '_embed'];

    static parseQueryParams(req: Request): ParsedQueryParams {
        const query = req.query;

        return {
            pagination: this.parsePagination(query),
            sort: this.parseSort(query._sort),
            filters: this.parseFilters(query),
            embed: this.parseEmbed(query._embed),
        };
    }

    private static parsePagination(query: any) {
        const _page = parseInt(query._page as string) || 1;
        const _per_page = parseInt(query._per_page as string) || 10;
        const _start = parseInt(query._start as string);
        const _end = parseInt(query._end as string);
        const _limit = parseInt(query._limit as string);

        return {
            page: _page,
            perPage: _per_page,
            start: isNaN(_start) ? undefined : _start,
            end: isNaN(_end) ? undefined : _end,
            limit: isNaN(_limit) ? undefined : _limit,
        };
    }

    private static parseSort(sortParam: any): Array<{ column: string; order: 'asc' | 'desc' }> | undefined {
        if (typeof sortParam !== 'string') return undefined;

        // JSON-Server syntax: _sort=field1,field2,-field3
        const sortFields = sortParam.split(',').map(field => field.trim()).filter(Boolean);

        if (sortFields.length === 0) return undefined;

        return sortFields.map(field => {
            if (field.startsWith('-')) {
                // Descending order with - prefix
                return {
                    column: field.substring(1),
                    order: 'desc' as const
                };
            } else {
                // Ascending order (default)
                return {
                    column: field,
                    order: 'asc' as const
                };
            }
        });
    }

    private static parseFilters(query: any): Record<string, any> {
        const filters: Record<string, any> = {};

        for (const key in query) {
            if (this.EXCLUDE_PARAMS.includes(key)) continue;

            const value = query[key];
            if (value === undefined || value === null) continue;

            filters[key] = value;
        }

        return filters;
    }

    private static parseEmbed(embedParam: any): string[] | undefined {
        if (!embedParam) return undefined;

        if (typeof embedParam === 'string') {
            // Support comma-separated values: _embed=user,comments
            return embedParam.split(',').map(item => item.trim()).filter(Boolean);
        }

        if (Array.isArray(embedParam)) {
            // Support multiple _embed parameters: _embed=user&_embed=comments
            return embedParam.map(item => String(item).trim()).filter(Boolean);
        }

        return undefined;
    }
}
