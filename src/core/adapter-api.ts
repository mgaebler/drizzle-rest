/**
 * Web API standard types and utilities for framework-agnostic implementation
 */

/**
 * Framework-agnostic request interface that adapters produce for the core system
 */
export interface IAdapterRequest {
    /** HTTP method */
    method: string;

    /** Request URL */
    url: string;

    /** Request headers */
    headers: Record<string, string>;

    /** Parsed URL parameters (e.g., :id from route) */
    params: Record<string, string>;

    /** Parsed query string parameters */
    query: Record<string, any>;

    /** Request body (parsed JSON) */
    body?: any;

    /** Request ID for logging/tracing */
    requestId?: string;
}

/**
 * Framework-agnostic response builder
 */
export interface IAdapterResponse {
    /** HTTP status code */
    status: number;

    /** Response headers */
    headers: Record<string, string>;

    /** Response body */
    body: any;
}

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

