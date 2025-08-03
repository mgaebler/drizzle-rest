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

/**
 * Create a Web API Response from our internal format
 */
export function toWebApiResponse(adapterResponse: IAdapterResponse): Response {
    return new Response(JSON.stringify(adapterResponse.body), {
        status: adapterResponse.status,
        headers: adapterResponse.headers
    });
}

/**
 * Parse Web API Request to our internal adapter format
 */
export async function parseToAdapterRequest(
    request: Request,
    params: Record<string, string> = {},
    requestId?: string
): Promise<IAdapterRequest> {
    const url = new URL(request.url);
    const query: Record<string, any> = {};

    // Parse query parameters
    url.searchParams.forEach((value, key) => {
        query[key] = value;
    });

    // Parse headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });

    // Parse body if present
    let body;
    if (request.body) {
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : undefined;
        } catch {
            // Leave body undefined if parsing fails
        }
    }

    return {
        method: request.method,
        url: request.url,
        headers,
        params,
        query,
        body,
        requestId
    };
}
