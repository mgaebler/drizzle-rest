import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class UpdateAction extends BaseAction {
    protected async executeCore(context: ICoreActionContext): Promise<any> {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = this.params.id;

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.partial().parse(this.body);

        const primaryKeyCol = columns[primaryKeyColumn];
        const results = await db
            .update(table)
            .set(validatedBody)
            .where(eq(primaryKeyCol, id))
            .returning();

        if (results.length === 0) {
            throw new Error('Record not found');
        }

        return results[0];
    }
}

export const coreUpdateAction: ICoreActionHandler = (request, context) => {
    const action = new UpdateAction();
    return action.execute(request, context, {
        actionType: ActionTypeEnum.UPDATE,
        includeId: true
    });
};
