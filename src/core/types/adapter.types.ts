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
 * Framework adapter interface for converting between framework-specific
 * request/response objects and our internal Web API-based format
 */
export interface IFrameworkAdapter {
    /**
     * Convert framework-specific request to our internal format
     */
    parseRequest(frameworkReq: any, params?: Record<string, string>): Promise<IAdapterRequest>;

    /**
     * Send our internal response through the framework's response mechanism
     */
    sendResponse(response: IAdapterResponse, frameworkRes: any): Promise<void>;

    /**
     * Extract route parameters from framework-specific routing
     */
    extractParams(frameworkReq: any): Record<string, string>;

    /**
     * Framework name for identification
     */
    readonly name: string;
}
