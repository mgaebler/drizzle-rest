import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { Request, Response } from 'express';

import { ErrorHandler } from '../utils/error-handler';
import { createHookContext } from '../utils/hook-context';
import { ActionContext, ActionHandler } from './types';

export const updateAction: ActionHandler = async (
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
            id,
            updateFields: Object.keys(req.body || {})
        }, 'Processing UPDATE request');

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.partial().parse(req.body);

        logger.debug({
            requestId,
            table: tableMetadata.name,
            id,
            validatedFields: Object.keys(validatedBody)
        }, 'Update body validated');

        // Execute beforeOperation hook
        const hookContext = createHookContext(
            req,
            res,
            'UPDATE',
            tableMetadata,
            primaryKeyColumn,
            columns,
            { record: validatedBody, recordId: id }
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
                }, 'UPDATE request failed in beforeOperation hook');

                ErrorHandler.handleError(res, hookError, 'beforeOperation', requestId);
                return;
            }
        }

        // Use dynamic primary key
        await db.update(table).set(validatedBody).where(eq(columns[primaryKeyColumn], id));

        const updatedRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
        const duration = Date.now() - startTime;

        if (updatedRecord.length === 0) {
            logger.info({
                requestId,
                table: tableMetadata.name,
                id,
                duration
            }, 'UPDATE request - record not found after update');

            ErrorHandler.handleNotFound(res, undefined, requestId);
            return;
        }

        let result = updatedRecord[0];

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                result = await tableConfig.hooks.afterOperation(hookContext, result);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'UPDATE request failed in afterOperation hook');

                ErrorHandler.handleError(res, hookError, 'afterOperation', requestId);
                return;
            }
        }

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            updatedFields: Object.keys(validatedBody),
            duration
        }, 'UPDATE request completed successfully');

        res.json(result);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: req.params.id,
            duration,
            error: error.message
        }, 'UPDATE request failed');

        ErrorHandler.handleError(res, error, 'updateOne', requestId);
    }
};
