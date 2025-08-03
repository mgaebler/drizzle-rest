import { eq } from 'drizzle-orm';

import { ICoreActionHandler } from '../handler.types';
import { OperationType } from '../hook-context';
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
        operationType: OperationType.GET_ONE,
        operationName: 'GET_ONE',
        includeId: true
    },
    (request) => ({ recordId: request.params.id })
);
