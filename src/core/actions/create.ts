import { createInsertSchema } from 'drizzle-zod';

import { ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { createActionHandler } from './base-action';

export const coreCreateAction: ICoreActionHandler = createActionHandler(
    async (request, context) => {
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
    },
    {
        actionType: ActionTypeEnum.CREATE,
        statusCode: 201
    }
);
