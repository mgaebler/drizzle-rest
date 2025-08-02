import { createInsertSchema } from 'drizzle-zod';
import { createDrizzleResponse, DrizzleRequest, DrizzleResponse } from '../web-api-types';
import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { CoreErrorHandler } from '../../utils/core-error-handler';

export const coreCreateAction: CoreActionHandler = async (
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
        logger.debug({
            requestId,
            table: tableMetadata.name,
            bodyKeys: Object.keys(request.body || {})
        }, 'Processing CREATE request');

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.parse(request.body);

        logger.debug({
            requestId,
            table: tableMetadata.name,
            validatedFields: Object.keys(validatedBody)
        }, 'Request body validated');

        // Execute beforeOperation hook
        const hookContext = createCoreHookContext(
            request,
            OperationType.CREATE,
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

                return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
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

                return CoreErrorHandler.handleError(hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            id: createdRecord[primaryKeyColumn],
            duration
        }, 'CREATE request completed successfully');

        return createDrizzleResponse(createdRecord, 201);

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            duration,
            error: error.message
        }, 'CREATE request failed');

        return CoreErrorHandler.handleError(error, 'create', requestId);
    }
};
