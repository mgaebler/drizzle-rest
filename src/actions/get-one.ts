import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

import { ErrorHandler } from '../utils/error-handler';
import { createHookContext, OperationType } from '../utils/hook-context';
import { ActionContext, ActionHandler } from './types';

export const getOneAction: ActionHandler = async (
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
            primaryKeyColumn
        }, 'Processing GET_ONE request');

        // Execute beforeOperation hook
        const hookContext = createHookContext(
            req,
            res,
            OperationType.GET_ONE,
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
                }, 'GET_ONE request failed in beforeOperation hook');

                ErrorHandler.handleError(res, hookError, 'beforeOperation', requestId);
                return;
            }
        }

        // Use dynamic primary key instead of hardcoded 'id'
        if (!columns[primaryKeyColumn]) {
            logger.error({
                requestId,
                table: tableMetadata.name,
                primaryKeyColumn,
                availableColumns: Object.keys(columns)
            }, 'Primary key column not found');

            res.status(500).json({
                error: `Primary key column '${primaryKeyColumn}' not found in table '${tableMetadata.name}'`,
                requestId
            });
            return;
        }

        const query = db.select().from(table).where(eq(columns[primaryKeyColumn], id));
        const data = await query;
        const duration = Date.now() - startTime;

        if (data.length === 0) {
            logger.info({
                requestId,
                table: tableMetadata.name,
                id,
                duration
            }, 'GET_ONE request - record not found');

            ErrorHandler.handleNotFound(res, undefined, requestId);
            return;
        }

        let result = data[0];

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
                }, 'GET_ONE request failed in afterOperation hook');

                ErrorHandler.handleError(res, hookError, 'afterOperation', requestId);
                return;
            }
        }

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            duration
        }, 'GET_ONE request completed successfully');

        res.json(result);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: req.params.id,
            duration,
            error: error.message
        }, 'GET_ONE request failed');

        ErrorHandler.handleError(res, error, 'getOne', requestId);
    }
};
