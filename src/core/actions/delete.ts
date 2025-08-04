import { eq } from 'drizzle-orm';

import type { IAdapterRequest } from '../types/adapter.types';
import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class DeleteAction extends BaseAction {
    protected async executeCore(request: IAdapterRequest, context: ICoreActionContext): Promise<any> {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = this.params.id;

        const primaryKeyCol = columns[primaryKeyColumn];
        const result = await db
            .delete(table)
            .where(eq(primaryKeyCol, id))
            .returning();

        if (result.length === 0) {
            throw new Error('Record not found');
        }

        return null; // DELETE returns 204 No Content
    }
}

export const coreDeleteAction: ICoreActionHandler = (request, context) => {
    const action = new DeleteAction();
    return action.execute(request, context, {
        actionType: ActionTypeEnum.DELETE,
        includeId: true,
        statusCode: 204
    });
};
