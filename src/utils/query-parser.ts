import { Request } from 'express';

export interface ParsedQueryParams {
    pagination: {
        page: number;
        perPage: number;
        start?: number;
        end?: number;
        limit?: number;
    };
    sort?: {
        column: string;
        order: 'asc' | 'desc';
    };
    filters: Record<string, any>;
}

export class QueryParser {
    private static readonly EXCLUDE_PARAMS = ['_page', '_per_page', 'sort', '_start', '_end', '_limit'];

    static parseQueryParams(req: Request): ParsedQueryParams {
        const query = req.query;

        return {
            pagination: this.parsePagination(query),
            sort: this.parseSort(query.sort),
            filters: this.parseFilters(query),
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

    private static parseSort(sortParam: any) {
        if (typeof sortParam !== 'string') return undefined;

        const [sortColumn, sortOrder] = sortParam.split('.');
        if (!sortColumn) return undefined;

        return {
            column: sortColumn,
            order: (sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
        };
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
}
