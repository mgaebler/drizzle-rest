import { ICoreActionHandler } from '../types/handler.types';
import { OperationTypeEnum } from '../types/operation.types';
import { QueryBuilder } from '../utils/query-builder';
import { CoreQueryParser } from '../utils/query-parser';
import { ActionOptions, BaseAction } from './base-action';

class GetManyAction extends BaseAction {
    protected async executeCore(request: any, context: any): Promise<any> {
        const { db, table, columns, schema, tablesMetadataMap, tableMetadata } = context;

        const params = CoreQueryParser.parseQueryParams(request);

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

    protected createHookData(request: any): any {
        const params = CoreQueryParser.parseQueryParams(request);
        return { filters: params.filters };
    }

    // Override to add pagination headers
    public async execute(request: any, context: any, options: ActionOptions): Promise<any> {
        const response = await super.execute(request, context, options);

        if (response.status === 200 && response.body?.totalCount !== undefined) {
            response.headers = {
                ...response.headers,
                'X-Total-Count': response.body.totalCount.toString(),
                'Access-Control-Expose-Headers': 'X-Total-Count'
            };
            // Return just the data, not the wrapper object
            response.body = response.body.data;
        }

        return response;
    }
}

export const coreGetManyAction: ICoreActionHandler = (request, context) => {
    const action = new GetManyAction();
    return action.execute(request, context, {
        operationType: OperationTypeEnum.GET_MANY
    });
};
