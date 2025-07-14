import pino from 'pino';

export interface LoggerOptions {
    /** Enable verbose/debug logging */
    verbose?: boolean;
    /** Log level (default: 'info', 'debug' in verbose mode) */
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
    const {
        verbose = false,
        level = verbose ? 'debug' : 'info',
        pretty = process.env.NODE_ENV === 'development',
        base = {},
        pinoOptions = {}
    } = options;

    const transport = pretty ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
            hideObject: false
        }
    } : undefined;

    const loggerConfig: pino.LoggerOptions = {
        level,
        base: {
            service: 'drizzle-rest-adapter',
            ...base
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        transport,
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
