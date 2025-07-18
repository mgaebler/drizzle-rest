import { createInsertSchema } from 'drizzle-zod';
import { Request, Response } from 'express';

import { ErrorHandler } from '../utils/error-handler';
import { createHookContext } from '../utils/hook-context';
import { ActionContext, ActionHandler } from './types';

export const createAction: ActionHandler = async (
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
        logger.debug({
            requestId,
            table: tableMetadata.name,
            bodyKeys: Object.keys(req.body || {})
        }, 'Processing CREATE request');

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.parse(req.body);

        logger.debug({
            requestId,
            table: tableMetadata.name,
            validatedFields: Object.keys(validatedBody)
        }, 'Request body validated');

        // Execute beforeOperation hook
        const hookContext = createHookContext(
            req,
            res,
            'CREATE',
            tableMetadata,
            primaryKeyColumn,
            columns,
            { record: validatedBody }
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
                }, 'CREATE request failed in beforeOperation hook');

                return ErrorHandler.handleError(res, hookError, 'beforeOperation', requestId);
            }
        }

        const result = await db.insert(table).values(validatedBody).returning();
        let createdRecord = (result as any[])[0];

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                createdRecord = await tableConfig.hooks.afterOperation(hookContext, createdRecord);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'CREATE request failed in afterOperation hook');

                return ErrorHandler.handleError(res, hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            recordId: createdRecord[primaryKeyColumn],
            duration
        }, 'CREATE request completed successfully');

        res.status(201).json(createdRecord);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            duration,
            error: error.message
        }, 'CREATE request failed');

        ErrorHandler.handleError(res, error, 'createOne', requestId);
    }
};
