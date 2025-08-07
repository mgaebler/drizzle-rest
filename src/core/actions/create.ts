import { createInsertSchema } from 'drizzle-zod';

import { ICoreActionHandler } from '../types/handler.types';
import { ICoreTableContext } from './action.types';
import { ActionTypeEnum } from './action.types';
import { BaseAction } from './base-action';

class CreateAction extends BaseAction {
    protected getActionType(): ActionTypeEnum {
        return ActionTypeEnum.CREATE;
    }

    protected getStatusCode(): number {
        return 201;
    }

    protected requiresId(): boolean {
        return false;
    }

    protected async runDatabaseQuery(tableContext: ICoreTableContext) {
        const { db, table } = tableContext;

        // Validate body presence
        if (!this.body || Object.keys(this.body).length === 0) {
            return this.createBadRequestError('Request body is required for create actions');
        }

        try {
            // Schema validation
            const insertSchema = createInsertSchema(table);
            const validatedBody = insertSchema.parse(this.body);

            const insertResult = await db.insert(table).values(validatedBody).returning();

            return insertResult[0];
        } catch (error: any) {
            return this.handleValidationError(error);
        }
    }
}

export const coreCreateAction: ICoreActionHandler = (tableContext, requestContext, logger) => {
    const action = new CreateAction(logger);
    return action.execute(tableContext, requestContext);
};
