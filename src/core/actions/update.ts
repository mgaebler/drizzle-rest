import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { createDrizzleResponse, DrizzleRequest, DrizzleResponse } from '../web-api-types';
import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { CoreErrorHandler } from '../../utils/core-error-handler';

export const coreUpdateAction: CoreActionHandler = async (
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
            updateFields: Object.keys(request.body || {})
        }, 'Processing UPDATE request');

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.partial().parse(request.body);

        logger.debug({
            requestId,
            table: tableMetadata.name,
            id,
            validatedFields: Object.keys(validatedBody)
        }, 'Update data validated');

        // Execute beforeOperation hook
        const hookContext = createCoreHookContext(
            request,
            OperationType.UPDATE,
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
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'UPDATE request failed in beforeOperation hook');

                return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
            }
        }

        const primaryKeyCol = columns[primaryKeyColumn];
        const results = await db
            .update(table)
            .set(validatedBody)
            .where(eq(primaryKeyCol, id))
            .returning();

        if (results.length === 0) {
            const duration = Date.now() - startTime;
            logger.info({
                requestId,
                table: tableMetadata.name,
                id,
                duration
            }, 'UPDATE request: record not found');

            return CoreErrorHandler.handleNotFound('Record not found', requestId);
        }

        let updatedRecord = results[0];

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                updatedRecord = await tableConfig.hooks.afterOperation(hookContext, updatedRecord);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'UPDATE request failed in afterOperation hook');

                return CoreErrorHandler.handleError(hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            duration
        }, 'UPDATE request completed successfully');

        return createDrizzleResponse(updatedRecord);

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: request.params.id,
            duration,
            error: error.message
        }, 'UPDATE request failed');

        return CoreErrorHandler.handleError(error, 'update', requestId);
    }
};
