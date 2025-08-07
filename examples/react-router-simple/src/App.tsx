import { Outlet, Link } from 'react-router-dom';

export function App() {
    return (
        <div>
            <nav>
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/users">Users</Link></li>
                    <li><Link to="/posts">Posts</Link></li>
                </ul>
            </nav>

            <div className="container">
                <Outlet />
            </div>
        </div>
    );
}
