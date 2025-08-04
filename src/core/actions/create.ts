import { createInsertSchema } from 'drizzle-zod';

import type { IAdapterRequest } from '../types/adapter.types';
import { ICoreActionContext, ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class CreateAction extends BaseAction {
    protected async executeCore(request: IAdapterRequest, context: ICoreActionContext): Promise<any> {
        const { db, table } = context;

        // Validate body
        if (!request.body || Object.keys(request.body).length === 0) {
            throw new Error('Request body is required for create actions');
        }

        // Schema validation
        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.parse(request.body);

        const insertResult = await db.insert(table).values(validatedBody).returning();

        return insertResult[0];
    }
}

export const coreCreateAction: ICoreActionHandler = (request, context) => {
    const action = new CreateAction();
    return action.execute(request, context, {
        actionType: ActionTypeEnum.CREATE,
        statusCode: 201
    });
};
