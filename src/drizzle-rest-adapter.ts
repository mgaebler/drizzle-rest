import express from 'express';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { asc, desc, eq, getTableColumns } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

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
      disabledEndpoints?: Array<'GET_MANY' | 'GET_ONE' | 'CREATE' | 'UPDATE' | 'DELETE'>;
    }
  };
}

export const createDrizzleRestAdapter = (options: DrizzleRestAdapterOptions) => {
  const router = express.Router();
  const { db, schema, tableOptions } = options;

  for (const tableName in schema) {
    const table = schema[tableName];

    // This is a simplified check. A more robust check might be needed
    // to differentiate between tables and relations.
    if (table instanceof PgTable) {
      const basePath = `/${tableName}`;
      const itemPath = `${basePath}/:id`;

      // GET /<table-name>
      router.get(basePath, async (req, res) => {
        try {
          const { page = 1, limit = 10, sort } = req.query;
          const columns = getTableColumns(table);

          const query = db.select().from(table).$dynamic();

          // Pagination
          query.limit(Number(limit)).offset((Number(page) - 1) * Number(limit));

          // Sorting
          if (typeof sort === 'string') {
            const [sortColumn, sortOrder] = sort.split('.');
            if (sortColumn && columns[sortColumn]) {
              query.orderBy(sortOrder?.toLowerCase() === 'desc' ? desc(columns[sortColumn]) : asc(columns[sortColumn]));
            }
          }

          // Filtering
          for (const key in req.query) {
            if (columns[key]) {
              query.where(eq(columns[key], req.query[key]));
            }
          }

          const data = await query;
          res.json(data);
        } catch (error: any) {
          console.error('Error in getMany:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      // POST /<table-name>
      router.post(basePath, async (req, res) => {
        try {
          const insertSchema = createInsertSchema(table);
          const validatedBody = insertSchema.parse(req.body);
          const result = await db.insert(table).values(validatedBody).returning();
          res.status(201).json(result[0]);
        } catch (error: any) {
          console.error('Error in createOne:', error);
          if (error.issues) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
          }
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      // GET /<table-name>/:id
      router.get(itemPath, async (req, res) => {
        try {
          const { id } = req.params;
          const { include } = req.query;
          const columns = getTableColumns(table);

          const query = db.select().from(table).where(eq(columns.id, id)).$dynamic();

          if (typeof include === 'string') {
            const relationsToInclude = include.split(',');
            for (const relationName of relationsToInclude) {
              // if (schema[relationName]) {
              //   query.with(schema[relationName]);
              // }
            }
          }

          const data = await query;

          if (data.length === 0) {
            return res.status(404).json({ error: 'Not Found' });
          }

          res.json(data[0]);
        } catch (error: any) {
          console.error('Error in getOne:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      // PATCH /<table-name>/:id
      router.patch(itemPath, async (req, res) => {
        try {
          const { id } = req.params;
          const columns = getTableColumns(table);
          const insertSchema = createInsertSchema(table);
          const validatedBody = insertSchema.partial().parse(req.body);

          await db.update(table).set(validatedBody).where(eq(columns.id, id));

          const updatedRecord = await db.select().from(table).where(eq(columns.id, id));

          if (updatedRecord.length === 0) {
            return res.status(404).json({ error: 'Not Found' });
          }

          res.json(updatedRecord[0]);
        } catch (error: any) {
          console.error('Error in updateOne:', error);
          if (error.issues) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
          }
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });

      // DELETE /<table-name>/:id
      router.delete(itemPath, async (req, res) => {
        try {
          const { id } = req.params;
          const columns = getTableColumns(table);

          // First check if the record exists
          const existingRecord = await db.select().from(table).where(eq(columns.id, id));
          if (existingRecord.length === 0) {
            return res.status(404).json({ error: 'Not Found' });
          }

          await db.delete(table).where(eq(columns.id, id));
          res.status(204).send();
        } catch (error: any) {
          console.error('Error in deleteOne:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
    }
  }

  return router;
};