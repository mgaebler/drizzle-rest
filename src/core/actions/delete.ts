import { eq } from 'drizzle-orm';

import { CoreErrorHandler } from '../../utils/core-error-handler';
import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { createDrizzleResponse, DrizzleRequest, DrizzleResponse } from '../web-api-types';

export const coreDeleteAction: CoreActionHandler = async (
    request: DrizzleRequest,
    context: CoreActionContext
): Promise<DrizzleResponse> => {
    const {
        db,
        table,
        tableMetadata,
        primaryKeyColumn,
        columns,
        tableConfig,
        logger
    } = context;

    const requestId = request.requestId;
    const startTime = Date.now();

    try {
        const id = request.params.id;

        logger.debug({
            requestId,
            table: tableMetadata.name,
            id
        }, 'Processing DELETE request');

        // Execute beforeOperation hook
        const hookContext = createCoreHookContext(
            request,
            OperationType.DELETE,
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
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'DELETE request failed in beforeOperation hook');

                return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
            }
        }

        const primaryKeyCol = columns[primaryKeyColumn];
        const result = await db
            .delete(table)
            .where(eq(primaryKeyCol, id))
            .returning();

        if (result.length === 0) {
            const duration = Date.now() - startTime;
            logger.info({
                requestId,
                table: tableMetadata.name,
                id,
                duration
            }, 'DELETE request: record not found');

            return CoreErrorHandler.handleNotFound('Record not found', requestId);
        }

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                await tableConfig.hooks.afterOperation(hookContext, result);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'DELETE request failed in afterOperation hook');

                return CoreErrorHandler.handleError(hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            duration
        }, 'DELETE request completed successfully');

        return createDrizzleResponse(null, 204);

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: request.params.id,
            duration,
            error: error.message
        }, 'DELETE request failed');

        return CoreErrorHandler.handleError(error, 'delete', requestId);
    }
};
