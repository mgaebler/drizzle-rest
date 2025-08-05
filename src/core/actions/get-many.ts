import { ICoreActionHandler } from '../types/handler.types';
import { QueryBuilder } from '../utils/query-builder';
import { CoreQueryParser } from '../utils/query-parser';
import { ICoreRequestContext } from './action.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class GetManyAction extends BaseAction {
    protected getActionType(): ActionTypeEnum {
        return ActionTypeEnum.GET_MANY;
    }

    protected getStatusCode(): number {
        return 200;
    }

    protected requiresId(): boolean {
        return false;
    }

    protected async executeCore(context: ICoreRequestContext): Promise<any> {
        const { db, table, columns, schema, tablesMetadataMap, tableMetadata } = context;

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
}

export const coreGetManyAction: ICoreActionHandler = (context) => {
    const action = new GetManyAction();
    return action.execute(context);
};
