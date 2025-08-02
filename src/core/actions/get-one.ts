import { eq } from 'drizzle-orm';
import { createDrizzleResponse, DrizzleRequest, DrizzleResponse } from '../web-api-types';
import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { CoreErrorHandler } from '../../utils/core-error-handler';

export const coreGetOneAction: CoreActionHandler = async (
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
            id,
            primaryKeyColumn
        }, 'Processing GET_ONE request');

        // Execute beforeOperation hook
        const hookContext = createCoreHookContext(
            request,
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
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'GET_ONE request failed in beforeOperation hook');

                return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
            }
        }

        const primaryKeyCol = columns[primaryKeyColumn];
        const results = await db
            .select()
            .from(table)
            .where(eq(primaryKeyCol, id))
            .limit(1);

        if (results.length === 0) {
            const duration = Date.now() - startTime;
            logger.info({
                requestId,
                table: tableMetadata.name,
                id,
                duration
            }, 'GET_ONE request: record not found');

            return CoreErrorHandler.handleNotFound('Record not found', requestId);
        }

        let record = results[0];

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                record = await tableConfig.hooks.afterOperation(hookContext, record);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'GET_ONE request failed in afterOperation hook');

                return CoreErrorHandler.handleError(hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            duration
        }, 'GET_ONE request completed successfully');

        return createDrizzleResponse(record);

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: request.params.id,
            duration,
            error: error.message
        }, 'GET_ONE request failed');

        return CoreErrorHandler.handleError(error, 'getOne', requestId);
    }
};
