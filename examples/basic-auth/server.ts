import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users, posts } from './schema';

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
    };
}

const app = express();
app.use(express.json());

// Mock database setup (replace with your actual database)
const db = drizzle(process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydb');

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = decoded as { id: number; email: string; role: string };
        next();
    });
};

// Login endpoint
app.post('/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        // Find user by email (this is a simplified example)
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (!user.length || !await bcrypt.compare(password, user[0].password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user[0].id,
                email: user[0].email,
                role: user[0].role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user[0].id, email: user[0].email, role: user[0].role } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Apply authentication middleware to all API routes
app.use('/api', authenticateToken);

// Create Drizzle REST adapter with authorization hooks
const apiRouter = createDrizzleRestAdapter({
    db,
    schema: { users, posts },
    tableOptions: {
        users: {
            hooks: {
                beforeOperation: async (context) => {
                    const { user } = context.req as AuthenticatedRequest;
                    const { operation, recordId } = context;

                    if (!user) {
                        throw new Error('Unauthorized');
                    }

                    // Only admins can delete users
                    if (operation === 'DELETE' && user.role !== 'admin') {
                        throw new Error('Forbidden: Only admins can delete users');
                    }

                    // Users can only update their own profile
                    if (operation === 'UPDATE' && user.role !== 'admin' && user.id !== parseInt(recordId as string)) {
                        throw new Error('Forbidden: Can only update own profile');
                    }

                    // Users can only view their own profile (non-admins)
                    if (operation === 'GET_ONE' && user.role !== 'admin' && user.id !== parseInt(recordId as string)) {
                        throw new Error('Forbidden: Can only view own profile');
                    }
                },
                afterOperation: async (context, result) => {
                    const { user } = context.req as AuthenticatedRequest;

                    if (!user) {
                        return result;
                    }

                    // Filter sensitive data for non-admin users
                    if (user.role !== 'admin') {
                        if (Array.isArray(result)) {
                            return result.map((record: any) => {
                                const { password, ...safeRecord } = record;
                                return safeRecord;
                            });
                        } else {
                            const { password, ...safeRecord } = result;
                            return safeRecord;
                        }
                    }

                    return result;
                }
            }
        },
        posts: {
            hooks: {
                beforeOperation: async (context) => {
                    const { user } = context.req as AuthenticatedRequest;
                    const { operation, record } = context;

                    if (!user) {
                        throw new Error('Unauthorized');
                    }

                    // Auto-set author for new posts
                    if (operation === 'CREATE' && record) {
                        record.authorId = user.id;
                        record.createdAt = new Date();
                    }

                    // Only author or admin can modify posts
                    if (operation === 'UPDATE' || operation === 'DELETE') {
                        const existingPost = await db.select().from(posts).where(eq(posts.id, parseInt(context.recordId as string)));

                        if (existingPost.length > 0) {
                            const post = existingPost[0];
                            if (post.authorId !== user.id && user.role !== 'admin') {
                                throw new Error('Forbidden: Can only modify own posts');
                            }
                        }
                    }
                }
            }
        }
    }
});

// Use the API router
app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📖 API documentation: http://localhost:${PORT}/api/v1`);
    console.log(`🔐 Login endpoint: POST http://localhost:${PORT}/auth/login`);
});
