import { eq } from 'drizzle-orm';

import { ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { createActionHandler } from './createActionHandler';

export const coreDeleteAction: ICoreActionHandler = createActionHandler(
    async (request, context) => {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = request.params.id;

        const primaryKeyCol = columns[primaryKeyColumn];
        const result = await db
            .delete(table)
            .where(eq(primaryKeyCol, id))
            .returning();

        if (result.length === 0) {
            throw new Error('Record not found');
        }

        return null; // DELETE returns 204 No Content
    },
    {
        actionType: ActionTypeEnum.DELETE,
        includeId: true,
        statusCode: 204
    }
);
