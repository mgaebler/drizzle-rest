/**
 * Web API standard types and utilities for framework-agnostic implementation
 */

import { IAdapterResponse } from './types/adapter.types';

/**
 * Convert Web API Response to our internal format
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

