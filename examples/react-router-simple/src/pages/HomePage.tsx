export function HomePage() {
    return (
        <div>
            <h1>React Router + Drizzle REST Adapter Demo</h1>

            <div className="api-info">
                <h3>🚀 REST API Endpoints</h3>
                <p>This demo showcases the React Router adapter for the Drizzle REST Adapter library.</p>

                <h4>Available Endpoints:</h4>
                <ul>
                    <li><code>GET /api/users</code> - List all users</li>
                    <li><code>GET /api/users/:id</code> - Get user by ID</li>
                    <li><code>POST /api/users</code> - Create new user</li>
                    <li><code>PUT /api/users/:id</code> - Replace user</li>
                    <li><code>PATCH /api/users/:id</code> - Update user</li>
                    <li><code>DELETE /api/users/:id</code> - Delete user</li>
                </ul>

                <ul>
                    <li><code>GET /api/posts</code> - List all posts</li>
                    <li><code>GET /api/posts/:id</code> - Get post by ID</li>
                    <li><code>POST /api/posts</code> - Create new post</li>
                    <li><code>PUT /api/posts/:id</code> - Replace post</li>
                    <li><code>PATCH /api/posts/:id</code> - Update post</li>
                    <li><code>DELETE /api/posts/:id</code> - Delete post</li>
                </ul>

                <h4>Query Parameters:</h4>
                <ul>
                    <li><code>?_page=1&_per_page=10</code> - Pagination</li>
                    <li><code>?_sort=createdAt&_order=desc</code> - Sorting</li>
                    <li><code>?name_like=John</code> - Text search</li>
                    <li><code>?published=true</code> - Filtering</li>
                </ul>
            </div>

            <p>Navigate to the <strong>Users</strong> or <strong>Posts</strong> pages to see the API in action with a simple frontend.</p>
        </div>
    );
}
