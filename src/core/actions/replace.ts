import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { CoreErrorHandler } from '../utils/core-error-handler';
import { createDrizzleResponse, DrizzleRequest, DrizzleResponse } from '../web-api';

export const coreReplaceAction: CoreActionHandler = async (
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
            replaceFields: Object.keys(request.body || {})
        }, 'Processing REPLACE request');

        const insertSchema = createInsertSchema(table);

        // For PUT, we need the full object (not partial)
        const validatedBody = insertSchema.parse(request.body);

        logger.debug({
            requestId,
            table: tableMetadata.name,
            id,
            validatedFields: Object.keys(validatedBody)
        }, 'Replace data validated');

        // Execute beforeOperation hook
        const hookContext = createCoreHookContext(
            request,
            OperationType.REPLACE,
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
                }, 'REPLACE request failed in beforeOperation hook');

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
            }, 'REPLACE request: record not found');

            return CoreErrorHandler.handleNotFound('Record not found', requestId);
        }

        let replacedRecord = results[0];

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            try {
                replacedRecord = await tableConfig.hooks.afterOperation(hookContext, replacedRecord);
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    id,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'REPLACE request failed in afterOperation hook');

                return CoreErrorHandler.handleError(hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            id,
            duration
        }, 'REPLACE request completed successfully');

        return createDrizzleResponse(replacedRecord);

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            id: request.params.id,
            duration,
            error: error.message
        }, 'REPLACE request failed');

        return CoreErrorHandler.handleError(error, 'replace', requestId);
    }
};
