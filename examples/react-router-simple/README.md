# React Router Simple Example

This example demonstrates how to use the Drizzle REST Adapter with React Router v7.

**Note:** This example requires the main drizzle-rest-adapter package to be built first. Currently, there are some TypeScript path resolution issues when building this example that need to be resolved.

## Quick Start

For now, you can run the Express example to see the REST API in action:

```bash
cd ../express
npm install
npm start
```

Then visit http://localhost:3000 to see the API working.

## React Router Integration

Here's how the React Router adapter would be used once the build issues are resolved:

```typescript
// router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { createReactRouterDrizzleRestRoute } from 'drizzle-rest-adapter';
import { db } from './db/connection';
import * as schema from './db/schema';

// Create the API route using our React Router adapter
const apiRoute = createReactRouterDrizzleRestRoute('/api/*', {
  db: db as any,
  schema,
});

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'posts', element: <PostsPage /> },
    ],
  },
  // API routes handled by Drizzle REST adapter
  apiRoute,
]);
```

## Features Demonstrated

The example includes:

1. **Users Management Page** (`UsersPage.tsx`):
   - List all users with `GET /api/users`
   - Create new users with `POST /api/users`
   - Delete users with `DELETE /api/users/:id`

2. **Posts Management Page** (`PostsPage.tsx`):
   - List all posts with `GET /api/posts`
   - Create new posts with `POST /api/posts`
   - Update posts (publish/unpublish) with `PATCH /api/posts/:id`
   - Delete posts with `DELETE /api/posts/:id`
   - Author selection from existing users

3. **Full REST API Support**:
   - All CRUD operations
   - JSON-Server compatible query parameters
   - Filtering, sorting, pagination
   - Relationship embedding

## Running the Example

To run this example, you would:

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open http://localhost:3001

The React Router adapter provides the same powerful REST capabilities as the Express adapter but integrates seamlessly with React Router's loader/action pattern.