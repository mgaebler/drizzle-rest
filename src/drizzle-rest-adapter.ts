import express from 'express';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { eq, getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { SchemaInspector } from './utils/schema-inspector';
import { QueryParser } from './utils/query-parser';
import { QueryBuilder } from './utils/query-builder';
import { ErrorHandler } from './utils/error-handler';

// A more specific type can be used if the schema is known.
// Using `any` for the schema makes the adapter more generic.
type DrizzleDb = PgliteDatabase<any>;

export interface DrizzleRestAdapterOptions {
    /** The Drizzle database instance. */
    db: DrizzleDb;

    /** The imported Drizzle schema object. */
    schema: Record<string, PgTable | any>;

    /** Detailed configuration per table. */
    tableOptions?: {
        [tableName: string]: {
            disabledEndpoints?: Array<'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'REPLACE' | 'DELETE'>;
        }
    };
}

export const createDrizzleRestAdapter = (options: DrizzleRestAdapterOptions) => {
    const router = express.Router();
    const { db, schema, tableOptions } = options;

    // Use schema introspection instead of simple iteration
    const inspector = new SchemaInspector(schema);
    const tables = inspector.extractTables();

    // Create a map for quick table metadata lookup
    const tablesMetadataMap = new Map();
    tables.forEach(table => tablesMetadataMap.set(table.name, table));

    tables.forEach(tableMetadata => {
        const table = schema[tableMetadata.name];
        const resourcePath = `/${tableMetadata.name}`;
        const itemPath = `${resourcePath}/:id`;

        // Get primary key column name(s)
        const primaryKeyColumns = tableMetadata.primaryKey;
        if (primaryKeyColumns.length === 0) {
            console.warn(`Skipping table ${tableMetadata.name}: no primary key found`);
            return;
        }

        // For now, handle single-column primary keys (composite keys in future)
        const primaryKeyColumn = primaryKeyColumns[0];
        const columns = getTableColumns(table);
        const tableConfig = tableOptions?.[tableMetadata.name];

        // GET /<table-name>
        if (!tableConfig?.disabledEndpoints?.includes('GET_MANY')) {
            router.get(resourcePath, async (req, res) => {
                try {
                    const params = QueryParser.parseQueryParams(req);
                    const queryBuilder = new QueryBuilder(db, table, columns, schema, tablesMetadataMap, tableMetadata.name);

                    const { query, embedKeys } = queryBuilder.buildSelectQuery(params);
                    let data = await query;

                    // Apply embeds if requested
                    if (embedKeys && embedKeys.length > 0) {
                        data = await queryBuilder.applyEmbeds(data, embedKeys);
                    }

                    const totalCount = await queryBuilder.getTotalCount(params.filters);

                    // Set X-Total-Count header
                    res.set('X-Total-Count', totalCount.toString());
                    res.json(data);
                } catch (error: any) {
                    ErrorHandler.handleError(res, error, 'getMany');
                }
            });
        }

        // POST /<table-name>
        if (!tableConfig?.disabledEndpoints?.includes('CREATE')) {
            router.post(resourcePath, async (req, res) => {
                try {
                    const insertSchema = createInsertSchema(table);
                    const validatedBody = insertSchema.parse(req.body);
                    const result = await db.insert(table).values(validatedBody).returning();
                    res.status(201).json((result as any[])[0]);
                } catch (error: any) {
                    ErrorHandler.handleError(res, error, 'createOne');
                }
            });
        }

        // GET /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('GET_ONE')) {
            router.get(itemPath, async (req, res) => {
                try {
                    const { id } = req.params;

                    // Use dynamic primary key instead of hardcoded 'id'
                    if (!columns[primaryKeyColumn]) {
                        return res.status(500).json({
                            error: `Primary key column '${primaryKeyColumn}' not found in table '${tableMetadata.name}'`
                        });
                    }

                    const query = db.select().from(table).where(eq(columns[primaryKeyColumn], id));
                    const data = await query;

                    if (data.length === 0) {
                        return ErrorHandler.handleNotFound(res);
                    }

                    res.json(data[0]);
                } catch (error: any) {
                    ErrorHandler.handleError(res, error, 'getOne');
                }
            });
        }

        // PATCH /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('UPDATE')) {
            router.patch(itemPath, async (req, res) => {
                try {
                    const { id } = req.params;
                    const insertSchema = createInsertSchema(table);
                    const validatedBody = insertSchema.partial().parse(req.body);

                    // Use dynamic primary key
                    await db.update(table).set(validatedBody).where(eq(columns[primaryKeyColumn], id));

                    const updatedRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));

                    if (updatedRecord.length === 0) {
                        return ErrorHandler.handleNotFound(res);
                    }

                    res.json(updatedRecord[0]);
                } catch (error: any) {
                    ErrorHandler.handleError(res, error, 'updateOne');
                }
            });
        }

        // PUT /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('REPLACE')) {
            router.put(itemPath, async (req, res) => {
                try {
                    const { id } = req.params;
                    const insertSchema = createInsertSchema(table);

                    // For PUT, we need the full object (not partial)
                    const validatedBody = insertSchema.parse(req.body);

                    // Use dynamic primary key
                    await db.update(table).set(validatedBody).where(eq(columns[primaryKeyColumn], id));

                    const updatedRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));

                    if (updatedRecord.length === 0) {
                        return ErrorHandler.handleNotFound(res);
                    }

                    res.json(updatedRecord[0]);
                } catch (error: any) {
                    ErrorHandler.handleError(res, error, 'replaceOne');
                }
            });
        }

        // DELETE /<table-name>/:id
        if (!tableConfig?.disabledEndpoints?.includes('DELETE')) {
            router.delete(itemPath, async (req, res) => {
                try {
                    const { id } = req.params;

                    // First check if the record exists using dynamic primary key
                    const existingRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
                    if (existingRecord.length === 0) {
                        return ErrorHandler.handleNotFound(res);
                    }

                    await db.delete(table).where(eq(columns[primaryKeyColumn], id));
                    res.status(204).send();
                } catch (error: any) {
                    ErrorHandler.handleError(res, error, 'deleteOne');
                }
            });
        }
    });

    return router;
};