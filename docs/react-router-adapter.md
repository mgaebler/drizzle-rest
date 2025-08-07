# React Router Adapter

The React Router adapter provides seamless integration between the Drizzle REST Adapter and React Router v7+ applications. It leverages React Router's loader and action functions to handle REST API requests.

## Installation

The React Router adapter is included in the main package:

```bash
npm install drizzle-rest-adapter
```

## Usage

### Basic Setup

```typescript
import { createReactRouterDrizzleRestAdapter } from 'drizzle-rest-adapter';
import { db } from './db/connection';
import * as schema from './db/schema';

// Create the adapter
const { loader, action } = createReactRouterDrizzleRestAdapter({
    db,
    schema
});

// Use in your route configuration
export const apiRoutes = [
    {
        path: "/api/v1/*",
        loader,
        action
    }
];
```

### Route Configuration Helper

For convenience, you can use the `createReactRouterDrizzleRestRoute` helper:

```typescript
import { createReactRouterDrizzleRestRoute } from 'drizzle-rest-adapter';
import { db } from './db/connection';
import * as schema from './db/schema';

// Create a complete route configuration
export const apiRoute = createReactRouterDrizzleRestRoute("/api/v1/*", {
    db,
    schema
});

// Use in your router
export const routes = [
    // ... your other routes
    apiRoute
];
```

### With Custom Configuration

```typescript
import { createReactRouterDrizzleRestAdapter, createLogger } from 'drizzle-rest-adapter';
import { db } from './db/connection';
import * as schema from './db/schema';

const logger = createLogger({ level: 'info' });

const { loader, action, handler } = createReactRouterDrizzleRestAdapter({
    db,
    schema,
    logger,
    tableOptions: {
        users: {
            disabledEndpoints: ['DELETE'], // Disable user deletion
            hooks: {
                beforeOperation: async (context) => {
                    console.log('Before operation:', context.action);
                }
            }
        }
    }
});

// You can use either separate loader/action or the combined handler
export const apiRoutes = [
    {
        path: "/api/v1/*",
        loader: handler, // Use combined handler for all HTTP methods
        action: handler
    }
];
```

### Complete Example

Here's a complete example of setting up a React Router application with the Drizzle REST adapter:

```typescript
// routes.tsx
import {
    createBrowserRouter,
    createRoutesFromElements,
    Route
} from 'react-router-dom';
import { createReactRouterDrizzleRestRoute } from 'drizzle-rest-adapter';
import { db } from './db/connection';
import * as schema from './db/schema';

import App from './App';
import HomePage from './pages/HomePage';

// Create the API route
const apiRoute = createReactRouterDrizzleRestRoute("/api/v1/*", {
    db,
    schema
});

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<App />}>
            <Route index element={<HomePage />} />
            {/* API routes */}
            <Route {...apiRoute} />
        </Route>
    )
);
```

## API Reference

### `createReactRouterDrizzleRestAdapter(options)`

Creates loader and action functions for React Router.

**Parameters:**
- `options`: Configuration options (same as other adapters)
  - `db`: Drizzle database instance
  - `schema`: Drizzle schema object
  - `tableOptions?`: Per-table configuration
  - `logger?`: Logger instance

**Returns:**
```typescript
{
    loader: LoaderFunction,     // Handles GET requests
    action: ActionFunction,     // Handles POST, PUT, PATCH, DELETE requests
    handler: LoaderFunction,    // Combined handler for all HTTP methods
    adapter: ReactRouterAdapter // The adapter instance
}
```

### `createReactRouterDrizzleRestRoute(path, options)`

Creates a complete React Router route configuration.

**Parameters:**
- `path`: The route path pattern (e.g., "/api/v1/*")
- `options`: Configuration options (same as above)

**Returns:**
```typescript
{
    path: string,
    loader: LoaderFunction,
    action: ActionFunction
}
```

## HTTP Methods

The React Router adapter supports all standard REST operations:

- **GET** `/api/v1/users` - List all users
- **GET** `/api/v1/users/1` - Get user by ID
- **POST** `/api/v1/users` - Create new user
- **PUT** `/api/v1/users/1` - Replace user
- **PATCH** `/api/v1/users/1` - Update user
- **DELETE** `/api/v1/users/1` - Delete user

## Query Parameters

The adapter supports JSON-Server compatible query syntax:

- **Filtering**: `?published=true&author.name=John`
- **Sorting**: `?_sort=createdAt&_order=desc`
- **Pagination**: `?_page=1&_per_page=10`
- **Embedding**: `?_embed=posts,comments`
- **Text Search**: `?title_like=React`

## Error Handling

The adapter automatically handles errors and returns appropriate HTTP responses. Errors are thrown as React Router `Response` objects:

```typescript
// Custom error handling in your routes
export const apiRouteWithErrorBoundary = {
    ...createReactRouterDrizzleRestRoute("/api/v1/*", { db, schema }),
    errorBoundary: ({ error }) => {
        console.error('API Error:', error);
        return <div>Something went wrong with the API</div>;
    }
};
```

## TypeScript Support

The adapter includes full TypeScript support with proper types for React Router functions:

```typescript
import type {
    LoaderFunctionArgs,
    ActionFunctionArgs
} from 'drizzle-rest-adapter';

// Custom loader with proper typing
export const customLoader = ({ request, params }: LoaderFunctionArgs) => {
    // Your custom logic here
};
```

## Notes

- React Router already uses standard Web API `Request` and `Response` objects, so minimal conversion is needed
- The adapter works with both React Router v6.4+ and v7+
- Server-side rendering (SSR) is fully supported
- The adapter can be used in both browser and Node.js environments
