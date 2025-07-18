import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

import { ErrorHandler } from '../utils/error-handler';
import { createHookContext } from '../utils/hook-context';
import { ActionContext, ActionHandler } from './types';

export const deleteAction: ActionHandler = async (
    req: Request,
    res: Response,
    context: ActionContext
): Promise<void> => {
    const {
        db,
        table,
        tableMetadata,
        primaryKeyColumn,
        columns,
        tableConfig,
        logger
    } = context;

    const requestId = (req as any).requestId;
    const startTime = Date.now();

    try {
        const { id } = req.params;

        logger.debug({
            requestId,
            table: tableMetadata.name,
            id
        }, 'Processing DELETE request');

        // Execute beforeOperation hook
        const hookContext = createHookContext(
            req,
            res,
            'DELETE',
            tableMetadata,
            primaryKeyColumn,
            columns,
            { recordId: id }
        );

        if (tableConfig?.hooks?.beforeOperation) {
            try {
                await tableConfig.hooks.beforeOperation(hookContext);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'DELETE request failed in beforeOperation hook');

                ErrorHandler.handleError(res, hookError, 'beforeOperation', requestId);
                return;
            }
        }

        // First check if the record exists using dynamic primary key
        const existingRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
        if (existingRecord.length === 0) {
            const duration = Date.now() - startTime;

            logger.info({
                requestId,
                table: tableMetadata.name,
                id,
                duration
            }, 'DELETE request - record not found');

            ErrorHandler.handleNotFound(res, undefined, requestId);
            return;
        }

        await db.delete(table).where(eq(columns[primaryKeyColumn], id));

        const result = { deleted: true };

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                await tableConfig.hooks.afterOperation(hookContext, result);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'DELETE request failed in afterOperation hook');

                ErrorHandler.handleError(res, hookError, 'afterOperation', requestId);
                return;
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            duration
        }, 'DELETE request completed successfully');

        res.status(204).send();
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: req.params.id,
            duration,
            error: error.message
        }, 'DELETE request failed');

        ErrorHandler.handleError(res, error, 'deleteOne', requestId);
    }
};
