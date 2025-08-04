import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

import { ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { createActionHandler } from './createActionHandler';

export const coreUpdateAction: ICoreActionHandler = createActionHandler(
    async (request, context) => {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = request.params.id;

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.partial().parse(request.body);

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
    },
    {
        actionType: ActionTypeEnum.UPDATE,
        includeId: true
    }
);
