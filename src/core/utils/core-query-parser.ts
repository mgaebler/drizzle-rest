import { z } from 'zod';

import { DrizzleRequest } from '../web-api-types';

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
    _per_page: z.coerce.number().min(1).max(1000).default(10),
    _start: z.coerce.number().min(0).optional(),
    _end: z.coerce.number().min(0).optional(),
    _limit: z.coerce.number().min(1).max(1000).optional(),
    _sort: SortSchema,
    _embed: EmbedSchema,
}).passthrough();

export interface ParsedQueryParams {
    pagination: {
        page: number;
        perPage: number;
        start?: number;
        end?: number;
        limit?: number;
    };
    sort?: Array<{ column: string; order: 'asc' | 'desc' }>;
    filters: Record<string, any>;
    embed?: string[];
}

export class CoreQueryParser {
    private static readonly EXCLUDE_PARAMS = [
        '_page', '_per_page', '_start', '_end', '_limit', '_sort', '_embed'
    ];

    static parseQueryParams(request: DrizzleRequest): ParsedQueryParams {
        try {
            // Parse and validate using Zod
            const parsed = QueryParamsSchema.parse(request.query);

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
            return this.fallbackParse(request);
        }
    }

    private static fallbackParse(request: DrizzleRequest): ParsedQueryParams {
        const query = request.query || {};

        // Basic pagination
        const page = parseInt(query._page) || 1;
        const perPage = parseInt(query._per_page) || 10;

        // Basic sorting
        let sort: Array<{ column: string; order: 'asc' | 'desc' }> | undefined;
        if (query._sort) {
            const sortStr = Array.isArray(query._sort) ? query._sort[0] : query._sort;
            sort = [{
                column: sortStr.startsWith('-') ? sortStr.substring(1) : sortStr,
                order: sortStr.startsWith('-') ? 'desc' : 'asc'
            }];
        }

        // Extract filters
        const filters: Record<string, any> = {};
        for (const [key, value] of Object.entries(query)) {
            if (!this.EXCLUDE_PARAMS.includes(key) && value !== undefined && value !== null) {
                filters[key] = value;
            }
        }

        return {
            pagination: { page, perPage },
            sort,
            filters,
            embed: query._embed ? String(query._embed).split(',') : undefined,
        };
    }
}
