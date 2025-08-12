import type { IAdapterResponse } from '../types/adapter.types';
import type { ICoreActionHandler } from '../types/handler.types';
import { QueryBuilder } from '../utils/query-builder';
import { CoreQueryParser } from '../utils/query-parser';
import { createAdapterResponse } from '../utils/response-helper';
import type { ICoreTableContext } from './action.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class GetManyAction extends BaseAction {
    protected getActionType(): ActionTypeEnum {
        return ActionTypeEnum.GET_MANY;
    }

    protected getStatusCode(): number {
        return 200;
    }

    protected async runDatabaseQuery(tableContext: ICoreTableContext) {
        const { db, table, columns, schema, tablesMetadataMap, tableMetadata } = tableContext;

        const params = CoreQueryParser.parseQueryParams(this.query);

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

        return {
            data: processedResults,
            totalCount
        };
    }

    protected createResponse(result: any, statusCode: number): IAdapterResponse {
        // Handle pagination response formatting
        if (result?.totalCount !== undefined) {
            const { data, totalCount } = result;
            const headers = {
                'X-Total-Count': totalCount.toString(),
                'Access-Control-Expose-Headers': 'X-Total-Count'
            };
            return createAdapterResponse(data, statusCode, headers);
        }

        return createAdapterResponse(result, statusCode);
    }
}

export const coreGetManyAction: ICoreActionHandler = (tableContext, requestContext, logger) => {
    const action = new GetManyAction(logger);
    return action.execute(tableContext, requestContext);
};
