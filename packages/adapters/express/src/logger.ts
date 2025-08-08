import pino from 'pino';

export interface LoggerOptions {
    level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    pretty?: boolean;
    base?: Record<string, any>;
    pinoOptions?: pino.LoggerOptions;
}

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
        } catch (err) {
            // Fallback: no pretty transport
        }
    }

    return pino({
        level,
        base,
        ...pinoOptions,
        transport
    });
}
