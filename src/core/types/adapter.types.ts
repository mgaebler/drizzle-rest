/**
 * Pure Web API Request - our clean gate FROM frameworks
 * No extensions, just the standard Web API Request
 */
export type IAdapterRequest = Request;

/**
 * Pure Web API Response - our clean gate TO frameworks
 * No extensions, just the standard Web API Response
 */
export type IAdapterResponse = Response;

/**
 * Request context interface for internal processing
 * Contains routing data and parsed request information
 */
export interface IRequestContext {
    method: string;
    url: string;
    headers: Headers;
    params: Record<string, string>;
    query: Record<string, any>;
    requestId: string;
    parsedBody: any;
}

/**
 * Framework adapter interface for converting between framework-specific
 * request/response objects and pure Web API Request/Response interfaces.
 * This ensures perfect compatibility with web standards.
 */
export interface IFrameworkAdapter {
    /**
     * Framework name for identification
     */
    readonly name: string;

    /**
     * Convert framework-specific request to pure Web API Request
     */
    parseRequest(frameworkReq: any): Promise<Request>;

    /**
     * Send pure Web API Response through the framework's response mechanism
     */
    sendResponse(response: Response, frameworkRes: any): Promise<void>;
}
