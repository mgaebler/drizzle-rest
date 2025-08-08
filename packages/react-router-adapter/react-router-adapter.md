# React Router Adapter for Drizzle REST

## Overview
The React Router adapter enables seamless integration of Drizzle ORM REST endpoints with React Router v7+. It provides loader and action functions for route-based data fetching and mutation.

## Installation
```bash
pnpm add @drizzle-rest/react-router-adapter @drizzle-rest/core
```

## Usage Example
```typescript
import { createReactRouterDrizzleRestAdapter } from '@drizzle-rest/react-router-adapter';
import { db, schema } from './db';

const { loader, action } = createReactRouterDrizzleRestAdapter({
  db,
  schema,
  // Optional: logger, hooks, tableOptions, etc.
});

// In your route config:
{
  path: '/api/*',
  loader,
  action,
}
```

## API Reference
### `createReactRouterDrizzleRestAdapter(options)`
Returns loader, action, handler, and adapter instance for use in React Router routes.

### `createReactRouterDrizzleRestRoute(path, options)`
Creates a route config object for React Router with REST endpoints.

## Configuration Options
- `db`: Drizzle ORM database instance
- `schema`: Drizzle schema object
- `logger`: Optional logger instance
- `hooks`: Optional lifecycle hooks
- `tableOptions`: Optional per-table config

## Error Handling
Errors are returned as standard Web API Response objects with appropriate status codes.

## Further Reading
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React Router Documentation](https://reactrouter.com/)
- [Drizzle REST Core](../../core)
