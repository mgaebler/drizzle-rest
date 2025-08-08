# Express Adapter for Drizzle REST

## Overview
The Express adapter provides a plug-and-play REST API for Drizzle ORM schemas using Express.js. It transforms Drizzle schemas into fully functional REST endpoints with minimal configuration.

## Installation
```bash
pnpm add @drizzle-rest/express-adapter @drizzle-rest/core express
```

## Usage Example
```typescript
import express from 'express';
import { createExpressDrizzleRestAdapter } from '@drizzle-rest/express-adapter';
import { db, schema } from './db';

const app = express();
app.use(express.json());

const drizzleApiRouter = createExpressDrizzleRestAdapter({
  db,
  schema,
  // Optional: logger, hooks, tableOptions, etc.
});

app.use('/api/v1', drizzleApiRouter);

app.listen(3000, () => {
  console.log('REST API running on http://localhost:3000/api/v1');
});
```

## Configuration Options
- `db`: Drizzle ORM database instance
- `schema`: Drizzle schema object
- `logger`: Optional logger instance
- `hooks`: Optional lifecycle hooks
- `tableOptions`: Optional per-table config

## API Reference
### `createExpressDrizzleRestAdapter(options)`
Creates an Express router with REST endpoints for your Drizzle schema.
- **Parameters:**
  - `options`: See above for configuration
- **Returns:** `express.Router`

### `ExpressAdapter`
Advanced usage: Direct access to the adapter class for custom integration.

## Error Handling
All errors are returned as JSON with appropriate HTTP status codes. Internal errors return status 500.

## Testing
See integration tests in `src/integration-tests/` for usage patterns and test helpers.

## Further Reading
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Express.js Documentation](https://expressjs.com/)
- [Drizzle REST Core](../core)
