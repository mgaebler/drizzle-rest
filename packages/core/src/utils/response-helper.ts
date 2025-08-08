import type { IAdapterResponse } from '../types/adapter.types';

/**
 * Creates a standardized adapter response using native Web API Response
 */
export function createAdapterResponse(
    body: any,
    status: number = 200,
    headers: Record<string, string> = {}
): IAdapterResponse {
    const responseHeaders = new Headers({
        'Content-Type': 'application/json',
        ...headers
    });

    // Handle 204 No Content - cannot have a body
    if (status === 204) {
        return new Response(null, {
            status,
            headers: responseHeaders
        });
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: responseHeaders
    });
}
