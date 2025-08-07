import { useEffect, useState } from 'react';

interface User {
  id: number;
  fullName: string;
  phone: string;
  createdAt?: string;
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ fullName: '', phone: '' });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.fullName || !newUser.phone) return;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNewUser({ fullName: '', phone: '' });
      await fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const deleteUser = async (id: number) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Users Management</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Create New User</h3>
        <form onSubmit={createUser} style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label htmlFor="fullName" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Full Name:
            </label>
            <input
              id="fullName"
              type="text"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              required
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Phone:
            </label>
            <input
              id="phone"
              type="text"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              required
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create User
          </button>
        </form>
      </div>

      <h3>Users List ({users.length} users)</h3>
      
      {users.length === 0 ? (
        <p>No users found. Create your first user above!</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                padding: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{user.fullName}</h4>
                <p style={{ margin: '0', color: '#666' }}>📞 {user.phone}</p>
                {user.createdAt && (
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#888' }}>
                    Created: {new Date(user.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => deleteUser(user.id)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h4>API Endpoints Being Used:</h4>
        <ul>
          <li><code>GET /api/users</code> - Fetch all users</li>
          <li><code>POST /api/users</code> - Create new user</li>
          <li><code>DELETE /api/users/:id</code> - Delete user</li>
        </ul>
      </div>
    </div>
  );
}
