/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize string input to prevent basic injection attacks
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;

    return input
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/['"`;\\]/g, '') // Remove potential SQL injection characters
        .trim();
}

/**
 * Sanitize object properties recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj } as any;

    for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'string' ? sanitizeString(item) :
                    typeof item === 'object' && item !== null ? sanitizeObject(item) : item
            );
        }
    }

    return sanitized;
}

/**
 * Validate and sanitize query parameters
 */
export function sanitizeQueryParams(query: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(query)) {
        // Sanitize the key itself
        const sanitizedKey = sanitizeString(key);

        if (typeof value === 'string') {
            sanitized[sanitizedKey] = sanitizeString(value);
        } else if (Array.isArray(value)) {
            sanitized[sanitizedKey] = value.map(v =>
                typeof v === 'string' ? sanitizeString(v) : v
            );
        } else {
            sanitized[sanitizedKey] = value;
        }
    }

    return sanitized;
}
