import { eq } from 'drizzle-orm';

import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class GetOneAction extends BaseAction {
    protected async executeCore(context: ICoreActionContext): Promise<any> {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = this.params.id;

        const primaryKeyCol = columns[primaryKeyColumn];
        const results = await db
            .select()
            .from(table)
            .where(eq(primaryKeyCol, id))
            .limit(1);

        if (results.length === 0) {
            throw new Error('Record not found');
        }

        return results[0];
    }
}

export const coreGetOneAction: ICoreActionHandler = (request, context) => {
    const action = new GetOneAction();
    return action.execute(request, context, {
        actionType: ActionTypeEnum.GET_ONE,
        includeId: true
    });
};
