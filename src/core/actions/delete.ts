import { eq } from 'drizzle-orm';

import { ICoreActionHandler } from '../types/handler.types';
import { ICoreTableContext } from './action.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class DeleteAction extends BaseAction {
    protected getActionType(): ActionTypeEnum {
        return ActionTypeEnum.DELETE;
    }

    protected getStatusCode(): number {
        return 204;
    }

    protected requiresId(): boolean {
        return true;
    }

    protected async runDatabaseQuery(tableContext: ICoreTableContext): Promise<any> {
        const { db, table, primaryKeyColumn, columns } = tableContext;
        const id = this.params.id;

        if (!id) {
            return this.createBadRequestError('ID parameter is required', { action: 'delete' });
        }

        const primaryKeyCol = columns[primaryKeyColumn];
        const result = await db
            .delete(table)
            .where(eq(primaryKeyCol, id))
            .returning();

        if (result.length === 0) {
            return this.createNotFoundError('Record not found', { action: 'delete', id });
        }

        return null; // DELETE returns 204 No Content
    }
}

export const coreDeleteAction: ICoreActionHandler = (tableContext, requestContext) => {
    const action = new DeleteAction();
    return action.execute(tableContext, requestContext);
};
