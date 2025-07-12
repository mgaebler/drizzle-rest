import express from 'express';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { asc, desc, eq, ne, like, inArray, gte, lte, getTableColumns, and } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { SchemaInspector } from './utils/schema-inspector';

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

  // Use schema introspection instead of simple iteration
  const inspector = new SchemaInspector(schema);
  const tables = inspector.extractTables();

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

    // GET /<table-name>
    router.get(resourcePath, async (req, res) => {
      try {
        // Parse JSON-Server style pagination parameters
        const _page = parseInt(req.query._page as string) || 1;
        const _per_page = parseInt(req.query._per_page as string) || 10;
        const sort = req.query.sort;

        // Parse range pagination parameters (priority over page-based pagination)
        const _start = parseInt(req.query._start as string);
        const _end = parseInt(req.query._end as string);
        const _limit = parseInt(req.query._limit as string);

        // Build the main query
        const query = db.select().from(table).$dynamic();

        // Apply filtering (exclude pagination and sorting params)
        const excludeParams = ['_page', '_per_page', 'sort', '_start', '_end', '_limit'];
        const whereConditions: any[] = [];

        // Parse and apply filters
        for (const key in req.query) {
          if (excludeParams.includes(key)) continue;

          const value = req.query[key];
          if (value === undefined || value === null) continue;

          // Handle JSON-Server filtering operators
          if (key.endsWith('_like')) {
            // Substring search
            const columnName = key.replace('_like', '');
            if (columns[columnName]) {
              whereConditions.push(like(columns[columnName], `%${value}%`));
            }
          } else if (key.endsWith('_ne')) {
            // Not equal
            const columnName = key.replace('_ne', '');
            if (columns[columnName]) {
              whereConditions.push(ne(columns[columnName], value));
            }
          } else if (key.endsWith('_gte')) {
            // Greater than or equal
            const columnName = key.replace('_gte', '');
            if (columns[columnName]) {
              whereConditions.push(gte(columns[columnName], value));
            }
          } else if (key.endsWith('_lte')) {
            // Less than or equal
            const columnName = key.replace('_lte', '');
            if (columns[columnName]) {
              whereConditions.push(lte(columns[columnName], value));
            }
          } else if (columns[key]) {
            // Direct equality or array membership
            if (Array.isArray(value)) {
              // Handle multiple values for the same parameter (array membership)
              whereConditions.push(inArray(columns[key], value));
            } else if (typeof value === 'string' && value.includes(',')) {
              // Handle comma-separated values as array
              const values = value.split(',').map(v => v.trim());
              whereConditions.push(inArray(columns[key], values));
            } else {
              // Single value equality
              whereConditions.push(eq(columns[key], value));
            }
          }
        }

        // Apply all where conditions with AND logic
        if (whereConditions.length > 0) {
          query.where(and(...whereConditions));
        }

        // Get total count for X-Total-Count header (before pagination)
        const countQuery = db.select().from(table).$dynamic();
        if (whereConditions.length > 0) {
          countQuery.where(and(...whereConditions));
        }

        const totalRecords = await countQuery;
        const totalCount = totalRecords.length;

        // Apply sorting
        if (typeof sort === 'string') {
          const [sortColumn, sortOrder] = sort.split('.');
          if (sortColumn && columns[sortColumn]) {
            query.orderBy(sortOrder?.toLowerCase() === 'desc' ? desc(columns[sortColumn]) : asc(columns[sortColumn]));
          }
        }

        // Apply pagination - prioritize range pagination over page-based pagination
        let limit: number;
        let offset: number;

        if (!isNaN(_start) && !isNaN(_end)) {
          // Range pagination with _start and _end (exclusive end)
          const startIndex = Math.max(0, _start); // Ensure non-negative
          const endIndex = Math.max(startIndex, _end); // Ensure end >= start
          limit = endIndex - startIndex;
          offset = startIndex;
        } else if (!isNaN(_start) && !isNaN(_limit)) {
          // Range pagination with _start and _limit
          const startIndex = Math.max(0, _start); // Ensure non-negative
          const limitValue = Math.max(0, _limit); // Ensure non-negative
          limit = limitValue;
          offset = startIndex;
        } else {
          // Default page-based pagination
          limit = Math.max(1, _per_page); // Ensure minimum of 1
          offset = Math.max(0, (_page - 1) * limit); // Ensure non-negative offset
        }

        query.limit(limit).offset(offset);

        const data = await query;

        // Set X-Total-Count header
        res.set('X-Total-Count', totalCount.toString());

        res.json(data);
      } catch (error: any) {
        console.error('Error in getMany:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // POST /<table-name>
    router.post(resourcePath, async (req, res) => {
      try {
        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.parse(req.body);
        const result = await db.insert(table).values(validatedBody).returning();
        res.status(201).json((result as any[])[0]);
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

        // Use dynamic primary key instead of hardcoded 'id'
        if (!columns[primaryKeyColumn]) {
          return res.status(500).json({
            error: `Primary key column '${primaryKeyColumn}' not found in table '${tableMetadata.name}'`
          });
        }

        const query = db.select().from(table).where(eq(columns[primaryKeyColumn], id));
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
        const insertSchema = createInsertSchema(table);
        const validatedBody = insertSchema.partial().parse(req.body);

        // Use dynamic primary key
        await db.update(table).set(validatedBody).where(eq(columns[primaryKeyColumn], id));

        const updatedRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));

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

        // First check if the record exists using dynamic primary key
        const existingRecord = await db.select().from(table).where(eq(columns[primaryKeyColumn], id));
        if (existingRecord.length === 0) {
          return res.status(404).json({ error: 'Not Found' });
        }

        await db.delete(table).where(eq(columns[primaryKeyColumn], id));
        res.status(204).send();
      } catch (error: any) {
        console.error('Error in deleteOne:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  });

  return router;
};