import { Request, Response } from 'express';

import { ErrorHandler } from '../utils/error-handler';
import { createHookContext } from '../utils/hook-context';
import { QueryBuilder } from '../utils/query-builder';
import { QueryParser } from '../utils/query-parser';
import { ActionContext, ActionHandler } from './types';

export const getManyAction: ActionHandler = async (
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
        schema,
        tablesMetadataMap,
        tableConfig,
        logger
    } = context;

    const requestId = (req as any).requestId;
    const startTime = Date.now();

    try {
        logger.debug({
            requestId,
            table: tableMetadata.name,
            query: req.query
        }, 'Processing GET_MANY request');

        const params = QueryParser.parseQueryParams(req);

        // Execute beforeOperation hook
        const hookContext = createHookContext(
            req,
            res,
            'GET_MANY',
            tableMetadata,
            primaryKeyColumn,
            columns,
            { filters: params.filters }
        );

        if (tableConfig?.hooks?.beforeOperation) {
            await tableConfig.hooks.beforeOperation(hookContext);
        }

        const queryBuilder = new QueryBuilder(db, table, columns, schema, tablesMetadataMap, tableMetadata.name);

        logger.debug({
            requestId,
            table: tableMetadata.name,
            parsedParams: {
                filters: params.filters,
                sort: params.sort,
                pagination: params.pagination,
                embed: params.embed
            }
        }, 'Parsed query parameters');

        const { query, embedKeys } = queryBuilder.buildSelectQuery(params);
        let data = await query;

        logger.debug({
            requestId,
            table: tableMetadata.name,
            recordsCount: data.length,
            hasEmbeds: embedKeys && embedKeys.length > 0
        }, 'Query executed');

        // Apply embeds if requested
        if (embedKeys && embedKeys.length > 0) {
            logger.debug({
                requestId,
                table: tableMetadata.name,
                embedKeys
            }, 'Applying embeds');

            data = await queryBuilder.applyEmbeds(data, embedKeys);
        }

        // Execute afterOperation hook
        if (tableConfig?.hooks?.afterOperation) {
            data = await tableConfig.hooks.afterOperation(hookContext, data);
        }

        const totalCount = await queryBuilder.getTotalCount(params.filters);
        const duration = Date.now() - startTime;

        logger.info({
            requestId,
            table: tableMetadata.name,
            recordsCount: data.length,
            totalCount,
            duration,
            hasFilters: Object.keys(params.filters).length > 0,
            hasSort: !!params.sort,
            hasPagination: !!params.pagination,
            hasEmbeds: embedKeys && embedKeys.length > 0
        }, 'GET_MANY request completed successfully');

        // Set X-Total-Count header
        res.set('X-Total-Count', totalCount.toString());
        res.json(data);
    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error({
            requestId,
            table: tableMetadata.name,
            duration,
            error: error.message
        }, 'GET_MANY request failed');

        // Check if error is from beforeOperation hook
        if (error.message && typeof error.message === 'string') {
            ErrorHandler.handleError(res, error, 'beforeOperation', requestId);
        } else {
            ErrorHandler.handleError(res, error, 'getMany', requestId);
        }
    }
};
