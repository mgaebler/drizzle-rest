import { CoreActionContext, CoreActionHandler } from '../handler';
import { createCoreHookContext, OperationType } from '../hook-context';
import { CoreErrorHandler } from '../utils/core-error-handler';
import { CoreQueryParser } from '../utils/core-query-parser';
import { QueryBuilder } from '../utils/query-builder';
import { createDrizzleResponse, DrizzleRequest, DrizzleResponse } from '../web-api-types';

export const coreGetManyAction: CoreActionHandler = async (
    request: DrizzleRequest,
    context: CoreActionContext
): Promise<DrizzleResponse> => {
    const {
        db,
        table,
        tableMetadata,
        primaryKeyColumn,
        columns,
        schema,
        tablesMetadataMap,
        tableConfig,
        logger
    } = context;

    const requestId = request.requestId;
    const startTime = Date.now();

    try {
        logger.debug({
            requestId,
            table: tableMetadata.name,
            query: request.query
        }, 'Processing GET_MANY request');

        const params = CoreQueryParser.parseQueryParams(request);

        // Execute beforeOperation hook
        const hookContext = createCoreHookContext(
            request,
            OperationType.GET_MANY,
            tableMetadata,
            primaryKeyColumn,
            columns,
            { filters: params.filters }
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
                }, 'GET_MANY request failed in beforeOperation hook');

                return CoreErrorHandler.handleError(hookError, 'beforeOperation', requestId);
            }
        }

        // Create QueryBuilder instance
        const queryBuilder = new QueryBuilder(
            db,
            table,
            columns,
            schema,
            tablesMetadataMap,
            tableMetadata.name
        );

        // Build and execute queries
        const { query, embedKeys } = queryBuilder.buildSelectQuery(params);
        const [results, totalCount] = await Promise.all([
            query,
            queryBuilder.getTotalCount(params.filters || {})
        ]);

        let processedResults = results;

        // Apply embedding if requested
        if (embedKeys && embedKeys.length > 0) {
            processedResults = await queryBuilder.applyEmbeds(processedResults, embedKeys);
        }

        // Execute afterOperation hook for each result
        if (tableConfig?.hooks?.afterOperation) {
            try {
                processedResults = await Promise.all(
                    results.map((result: any) =>
                        tableConfig.hooks!.afterOperation!(hookContext, result)
                    )
                );
            } catch (hookError) {
                logger.error({
                    requestId,
                    table: tableMetadata.name,
                    duration: Date.now() - startTime,
                    error: hookError
                }, 'GET_MANY request failed in afterOperation hook');

                return CoreErrorHandler.handleError(hookError, 'afterOperation', requestId);
            }
        }

        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            resultCount: processedResults.length,
            totalCount,
            duration
        }, 'GET_MANY request completed successfully');

        // Create response with pagination headers
        const response = createDrizzleResponse(processedResults, 200, {
            'X-Total-Count': totalCount.toString(),
            'Access-Control-Expose-Headers': 'X-Total-Count'
        });

        return response;

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            duration,
            error: error.message
        }, 'GET_MANY request failed');

        return CoreErrorHandler.handleError(error, 'getMany', requestId);
    }
};
