# React Router Simple Example

This example demonstrates how to use the Drizzle REST Adapter with React Router v7.

## Setup

```bash
npm install
npm run dev
```

## Usage Example

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
  // API routes
  apiRoute,
]);
```

## Available Endpoints

Once running, the following REST endpoints will be available:

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Replace user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Posts
- `GET /api/posts` - List all posts
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Replace post
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

## Query Parameters

Supports JSON-Server compatible query syntax:
- `?_page=1&_per_page=10` - Pagination
- `?_sort=createdAt&_order=desc` - Sorting
- `?name_like=John` - Text search
- `?published=true` - Filtering
