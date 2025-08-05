import { eq } from 'drizzle-orm';

import { ICoreActionHandler } from '../types/handler.types';
import { ICoreTableContext } from './action.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class GetOneAction extends BaseAction {
    protected getActionType(): ActionTypeEnum {
        return ActionTypeEnum.GET_ONE;
    }

    protected getStatusCode(): number {
        return 200;
    }

    protected requiresId(): boolean {
        return true;
    }

    protected async runDatabaseQuery(tableContext: ICoreTableContext): Promise<any> {
        const { db, table, primaryKeyColumn, columns } = tableContext;
        const id = this.params.id;

        if (!id) {
            return this.createBadRequestError('ID parameter is required', { action: 'get-one' });
        }

        const primaryKeyCol = columns[primaryKeyColumn];
        const results = await db
            .select()
            .from(table)
            .where(eq(primaryKeyCol, id))
            .limit(1);

        if (results.length === 0) {
            return this.createNotFoundError('Record not found', { action: 'get-one', id });
        }

        return results[0];
    }
}

export const coreGetOneAction: ICoreActionHandler = (tableContext, requestContext) => {
    const action = new GetOneAction();
    return action.execute(tableContext, requestContext);
};
