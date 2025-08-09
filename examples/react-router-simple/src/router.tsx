import { createBrowserRouter } from 'react-router-dom';
import { createReactRouterDrizzleRestRoute } from '@drizzle-rest/react-router-adapter';
import { App } from './App';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { PostsPage } from './pages/PostsPage';
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
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'users',
                element: <UsersPage />,
            },
            {
                path: 'posts',
                element: <PostsPage />,
            },

        ],
    },
    // API routes
    apiRoute,
]);
