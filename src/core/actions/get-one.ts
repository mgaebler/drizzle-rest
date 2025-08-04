import { eq } from 'drizzle-orm';

import { ICoreActionHandler } from '../types/handler.types';
import { ActionTypeEnum } from './action.types';
import { createActionHandler } from './base-action';

export const coreGetOneAction: ICoreActionHandler = createActionHandler(
    async (request, context) => {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = request.params.id;

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
    },
    {
        actionType: ActionTypeEnum.GET_ONE,
        includeId: true
    },
    (request) => ({ recordId: request.params.id })
);
