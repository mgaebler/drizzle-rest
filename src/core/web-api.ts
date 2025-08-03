/**
 * Web API standard types and utilities for framework-agnostic implementation
 */

/**
 * Framework-agnostic request interface based on Web API Request
 * but with additional properties needed by the adapter
 */
export interface DrizzleRequest {
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

    /** User context from authentication middleware */
    user?: any;

    /** Request ID for logging/tracing */
    requestId?: string;
}

/**
 * Framework-agnostic response builder
 */
export interface DrizzleResponse {
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
export function createDrizzleResponse(
    body: any,
    status: number = 200,
    headers: Record<string, string> = {}
): DrizzleResponse {
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
export function toWebApiResponse(drizzleResponse: DrizzleResponse): Response {
    return new Response(JSON.stringify(drizzleResponse.body), {
        status: drizzleResponse.status,
        headers: drizzleResponse.headers
    });
}

/**
 * Parse Web API Request to our internal format
 */
export async function parseDrizzleRequest(
    request: Request,
    params: Record<string, string> = {},
    user?: any,
    requestId?: string
): Promise<DrizzleRequest> {
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
        user,
        requestId
    };
}
