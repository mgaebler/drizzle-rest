import { useEffect, useState } from 'react';

interface Post {
  id: number;
  title: string;
  content: string;
  authorId?: number;
  published: boolean;
  createdAt?: string;
}

interface User {
  id: number;
  fullName: string;
  phone: string;
}

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    authorId: '',
    published: false,
  });

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/posts');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    try {
      const postData = {
        title: newPost.title,
        content: newPost.content,
        authorId: newPost.authorId ? parseInt(newPost.authorId) : null,
        published: newPost.published,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNewPost({ title: '', content: '', authorId: '', published: false });
      await fetchPosts(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  const deletePost = async (id: number) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchPosts(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const togglePublished = async (post: Post) => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !post.published }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchPosts(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post');
    }
  };

  const getUserName = (authorId?: number) => {
    if (!authorId) return 'Anonymous';
    const user = users.find(u => u.id === authorId);
    return user ? user.fullName : `User ${authorId}`;
  };

  useEffect(() => {
    fetchPosts();
    fetchUsers();
  }, []);

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h1>Posts Management</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Create New Post</h3>
        <form onSubmit={createPost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Title:
            </label>
            <input
              id="title"
              type="text"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          
          <div>
            <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Content:
            </label>
            <textarea
              id="content"
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              required
              rows={4}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label htmlFor="authorId" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Author:
              </label>
              <select
                id="authorId"
                value={newPost.authorId}
                onChange={(e) => setNewPost({ ...newPost, authorId: e.target.value })}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Anonymous</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newPost.published}
                  onChange={(e) => setNewPost({ ...newPost, published: e.target.checked })}
                />
                Published
              </label>
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
              Create Post
            </button>
          </div>
        </form>
      </div>

      <h3>Posts List ({posts.length} posts)</h3>
      
      {posts.length === 0 ? (
        <p>No posts found. Create your first post above!</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: '1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: post.published ? '#f8fff8' : '#fff8f8',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{post.title}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>{post.content}</p>
                  <div style={{ fontSize: '0.875rem', color: '#888' }}>
                    <span>By: {getUserName(post.authorId)}</span>
                    {post.createdAt && (
                      <span> | Created: {new Date(post.createdAt).toLocaleString()}</span>
                    )}
                    <span> | Status: {post.published ? '✅ Published' : '📝 Draft'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button
                    onClick={() => togglePublished(post)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: post.published ? '#ffc107' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {post.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h4>API Endpoints Being Used:</h4>
        <ul>
          <li><code>GET /api/posts</code> - Fetch all posts</li>
          <li><code>POST /api/posts</code> - Create new post</li>
          <li><code>PATCH /api/posts/:id</code> - Update post (toggle published status)</li>
          <li><code>DELETE /api/posts/:id</code> - Delete post</li>
          <li><code>GET /api/users</code> - Fetch users for author selection</li>
        </ul>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          Try filtering posts: <code>/api/posts?published=true</code> or sorting: <code>/api/posts?_sort=createdAt&_order=desc</code>
        </p>
      </div>
    </div>
  );
}
