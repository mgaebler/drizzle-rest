import type { IAdapterResponse } from '../types/adapter.types';

/**
 * Creates a standardized adapter response
 */
export function createAdapterResponse(
    body: any,
    status: number = 200,
    headers: Record<string, string> = {}
): IAdapterResponse {
    return {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body
    };
}
