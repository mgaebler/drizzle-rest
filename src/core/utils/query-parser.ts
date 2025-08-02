import { Request } from 'express';
import { z } from 'zod';

// Define Zod schemas for validation and parsing
const SortSchema = z.string().optional().transform((value) => {
    if (!value) return undefined;

    const sortFields = value.split(',').map(field => field.trim()).filter(Boolean);
    if (sortFields.length === 0) return undefined;

    return sortFields.map(field => {
        if (field.startsWith('-')) {
            return {
                column: field.substring(1),
                order: 'desc' as const
            };
        }
        return {
            column: field,
            order: 'asc' as const
        };
    });
});

const EmbedSchema = z.union([
    z.string().transform(str => str.split(',').map(item => item.trim()).filter(Boolean)),
    z.array(z.string()).transform(arr => arr.map(item => item.trim()).filter(Boolean))
]).optional();

const QueryParamsSchema = z.object({
    _page: z.coerce.number().min(1).default(1),
    _per_page: z.coerce.number().min(1).max(100).default(10),
    _start: z.coerce.number().min(0).optional(),
    _end: z.coerce.number().min(0).optional(),
    _limit: z.coerce.number().min(1).optional(),
    _sort: SortSchema,
    _embed: EmbedSchema,
}).passthrough(); // Allow additional properties for filters

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
        try {
            // Parse and validate using Zod
            const parsed = QueryParamsSchema.parse(req.query);

            // Extract filters (all params except the special ones)
            const filters: Record<string, any> = {};
            for (const [key, value] of Object.entries(parsed)) {
                if (!this.EXCLUDE_PARAMS.includes(key) && value !== undefined && value !== null) {
                    filters[key] = value;
                }
            }

            return {
                pagination: {
                    page: parsed._page,
                    perPage: parsed._per_page,
                    start: parsed._start,
                    end: parsed._end,
                    limit: parsed._limit,
                },
                sort: parsed._sort,
                filters,
                embed: parsed._embed,
            };
        } catch (error) {
            // Fallback to basic parsing if validation fails
            console.warn('Query validation failed, using fallback parsing:', error);
            return this.fallbackParse(req);
        }
    }

    private static fallbackParse(req: Request): ParsedQueryParams {
        const query = req.query;

        return {
            pagination: {
                page: Math.max(parseInt(query._page as string) || 1, 1),
                perPage: Math.min(Math.max(parseInt(query._per_page as string) || 10, 1), 100),
                start: isNaN(parseInt(query._start as string)) ? undefined : Math.max(parseInt(query._start as string), 0),
                end: isNaN(parseInt(query._end as string)) ? undefined : Math.max(parseInt(query._end as string), 0),
                limit: isNaN(parseInt(query._limit as string)) ? undefined : Math.max(parseInt(query._limit as string), 1),
            },
            sort: this.parseSort(query._sort),
            filters: this.parseFilters(query),
            embed: this.parseEmbed(query._embed),
        };
    }

    private static parseSort(sortParam: any): Array<{ column: string; order: 'asc' | 'desc' }> | undefined {
        if (typeof sortParam !== 'string') return undefined;

        const sortFields = sortParam.split(',').map(field => field.trim()).filter(Boolean);
        if (sortFields.length === 0) return undefined;

        return sortFields.map(field => {
            if (field.startsWith('-')) {
                return {
                    column: field.substring(1),
                    order: 'desc' as const
                };
            } else {
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
            return embedParam.split(',').map(item => item.trim()).filter(Boolean);
        }

        if (Array.isArray(embedParam)) {
            return embedParam.map(item => String(item).trim()).filter(Boolean);
        }

        return undefined;
    }
}
