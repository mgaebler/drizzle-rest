import pino from 'pino';

export interface LoggerOptions {
    /** Log level (default: 'info') */
    level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    /** Enable pretty printing for development */
    pretty?: boolean;
    /** Custom log fields to include in all log messages */
    base?: Record<string, any>;
    /** Additional Pino options */
    pinoOptions?: pino.LoggerOptions;
}

/**
 * Creates a configured Pino logger instance for drizzle-rest-adapter
 */
export function createLogger(options: LoggerOptions = {}): pino.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    const {
        level = isDevelopment ? 'debug' : 'info',
        pretty = isDevelopment,
        base = {},
        pinoOptions = {}
    } = options;

    let transport;
    if (pretty) {
        try {
            transport = {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                    singleLine: false,
                    hideObject: false
                }
            };
        } catch {
            // Fallback to default transport if pino-pretty is not available
            console.warn('pino-pretty not available, using default transport');
            transport = undefined;
        }
    }

    const loggerConfig: pino.LoggerOptions = {
        level,
        base: {
            service: 'drizzle-rest-adapter',
            version: process.env.npm_package_version || 'unknown',
            environment: process.env.NODE_ENV || 'development',
            ...base
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        transport,
        // Disable pretty printing in production for better performance
        ...(isProduction && { formatters: { level: (label) => ({ level: label }) } }),
        serializers: {
            error: pino.stdSerializers.err,
            req: pino.stdSerializers.req,
            res: pino.stdSerializers.res,
            ...pinoOptions.serializers
        },
        ...pinoOptions
    };

    return pino(loggerConfig);
}

/**
 * Default logger instance - can be used throughout the application
 */
export const defaultLogger = createLogger();

/**
 * Type for logger that can be passed around the application
 */
export type Logger = pino.Logger;
