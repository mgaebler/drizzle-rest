import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

import { ICoreActionHandler } from '../types/handler.types';
import { ICoreTableContext } from './action.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class UpdateAction extends BaseAction {
    protected getActionType(): ActionTypeEnum {
        return ActionTypeEnum.UPDATE;
    }

    protected getStatusCode(): number {
        return 200;
    }

    protected requiresId(): boolean {
        return true;
    }

    protected async runDatabaseQuery(tableContext: ICoreTableContext) {
        const { db, table, primaryKeyColumn, columns } = tableContext;
        const id = this.params.id;

        if (!id) {
            return this.createBadRequestError('ID parameter is required', { action: 'update' });
        }

        if (!this.body || Object.keys(this.body).length === 0) {
            return this.createBadRequestError('Request body is required for update actions', { action: 'update', id });
        }

        try {
            const insertSchema = createInsertSchema(table);
            const validatedBody = insertSchema.partial().parse(this.body);

            const primaryKeyCol = columns[primaryKeyColumn];
            const results = await db
                .update(table)
                .set(validatedBody)
                .where(eq(primaryKeyCol, id))
                .returning();

            if (results.length === 0) {
                return this.createNotFoundError('Record not found', { action: 'update', id });
            }

            return results[0];
        } catch (error: any) {
            return this.handleValidationError(error, { action: 'update', id });
        }
    }
}

export const coreUpdateAction: ICoreActionHandler = (tableContext, requestContext) => {
    const action = new UpdateAction();
    return action.execute(tableContext, requestContext);
};
