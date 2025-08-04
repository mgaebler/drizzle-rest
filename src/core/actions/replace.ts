import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

import { ICoreActionHandler } from '../types/handler.types';
import { createActionHandler } from './base-action';
import { OperationTypeEnum } from './operation.types';

export const coreReplaceAction: ICoreActionHandler = createActionHandler(
    async (request, context) => {
        const { db, table, primaryKeyColumn, columns } = context;
        const id = request.params.id;

        const insertSchema = createInsertSchema(table);
        // For PUT, we need the full object (not partial)
        const validatedBody = insertSchema.parse(request.body);

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
        operationType: OperationTypeEnum.REPLACE,
        includeId: true
    },
    (request) => ({ record: request.body, recordId: request.params.id })
);
