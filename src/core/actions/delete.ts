import { eq } from 'drizzle-orm';

import { CoreActionHandler } from '../handler';
import { OperationType } from '../hook-context';
import { createActionHandler } from './base-action';

export const coreDeleteAction: CoreActionHandler = createActionHandler(
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
        operationType: OperationType.DELETE,
        operationName: 'DELETE',
        includeId: true,
        statusCode: 204
    },
    (request) => ({ recordId: request.params.id })
);
