import { Response } from 'express';

export class ErrorHandler {
    static handleError(res: Response, error: any, operation: string): void {
        console.error(`Error in ${operation}:`, error);

        if (error.issues) {
            // Zod validation error
            res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
            return;
        }

        if (error.message?.includes('not found') || error.code === 'P2025') {
            // Not found error
            res.status(404).json({ error: 'Not Found' });
            return;
        }

        // Generic server error
        res.status(500).json({ error: 'Internal Server Error' });
    }

    static handleNotFound(res: Response, message = 'Not Found'): void {
        res.status(404).json({ error: message });
    }

    static handleValidationError(res: Response, error: any): void {
        res.status(400).json({
            error: 'Validation failed',
            details: error.issues || error.message
        });
    }
}
