import { createInsertSchema } from 'drizzle-zod';

import { CoreActionHandler } from '../handler';
import { OperationType } from '../hook-context';
import { createActionHandler } from './base-action';

export const coreCreateAction: CoreActionHandler = createActionHandler(
    async (request, context) => {
        const { db, table } = context;

        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.parse(request.body);

        const result = await db.insert(table).values(validatedBody).returning();
        return (result as any[])[0];
    },
    {
        operationType: OperationType.CREATE,
        operationName: 'CREATE',
        statusCode: 201
    },
    (request) => ({ record: request.body })
);
