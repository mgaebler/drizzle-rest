/**
 * Utility functions for working with native Web API Request objects
 */

import type { IAdapterRequest, IRequestContext } from '../types/adapter.types';

/**
 * Get a header value from the request using native Headers.get() method
 */
export function getHeader(request: IAdapterRequest, name: string): string | null {
    return request.headers.get(name);
}

/**
 * Get all header values for a given name as an array
 * Uses Headers.getSetCookie() for Set-Cookie or manual iteration for others
 */
export function getHeaderValues(request: IAdapterRequest, name: string): string[] {
    const values: string[] = [];

    // Use the Headers forEach to get all values
    request.headers.forEach((value, key) => {
        if (key.toLowerCase() === name.toLowerCase()) {
            values.push(value);
        }
    });

    return values;
}

/**
 * Check if a header exists in the request using native Headers.has() method
 */
export function hasHeader(request: IAdapterRequest, name: string): boolean {
    return request.headers.has(name);
}

/**
 * Get content type from request headers
 */
export function getContentType(request: IAdapterRequest): string | null {
    return request.headers.get('content-type');
}

/**
 * Get authorization header from request
 */
export function getAuthorization(request: IAdapterRequest): string | null {
    return request.headers.get('authorization');
}

/**
 * Extract pathname from the request URL using native URL.pathname
 */
export function getPathname(request: IAdapterRequest): string {
    const url = new URL(request.url);
    return url.pathname;
}

/**
 * Extract search params from the request URL using native URL.searchParams
 */
export function getSearchParams(request: IAdapterRequest): URLSearchParams {
    const url = new URL(request.url);
    return url.searchParams;
}

/**
 * Convert URLSearchParams to a plain object with support for multiple values
 * Handles arrays when the same parameter appears multiple times
 */
export function parseQueryParams(searchParams: URLSearchParams): Record<string, any> {
    const query: Record<string, any> = {};

    // Group all values by key
    const paramGroups = new Map<string, string[]>();

    for (const [key, value] of searchParams) {
        if (!paramGroups.has(key)) {
            paramGroups.set(key, []);
        }
        paramGroups.get(key)?.push(value);
    }

    // Convert to final object format
    for (const [key, values] of paramGroups) {
        query[key] = values.length === 1 ? values[0] : values;
    }

    return query;
}

/**
 * Parse query parameters from a URL string
 */
export function parseQueryParamsFromUrl(url: string): Record<string, any> {
    const urlObj = new URL(url);
    return parseQueryParams(urlObj.searchParams);
}

/**
 * Create a simplified request context object for logging (removing sensitive headers)
 */
export function sanitizeRequestForLogging(context: IRequestContext): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    const sanitizedHeaders = new Headers();
    context.headers.forEach((value: string, key: string) => {
        if (sensitiveHeaders.includes(key.toLowerCase())) {
            sanitizedHeaders.set(key, '[REDACTED]');
        } else {
            sanitizedHeaders.set(key, value);
        }
    });

    return {
        method: context.method,
        url: context.url,
        headers: sanitizedHeaders,
        params: context.params,
        query: context.query,
        requestId: context.requestId,
    };
}
