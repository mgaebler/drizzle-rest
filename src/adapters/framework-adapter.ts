import { IAdapterRequest, IAdapterResponse } from '../core/adapter-api';

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
