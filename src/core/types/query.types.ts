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
