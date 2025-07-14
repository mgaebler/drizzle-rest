import { db } from './connection';
import * as schema from './schema';

export async function seedDatabase() {
    console.log('🌱 Starting database seed...');

    try {
        // Create sample users
        const users = await db.insert(schema.users).values([
            {
                name: 'Alice Johnson',
                email: 'alice@example.com',
                bio: 'Full-stack developer passionate about TypeScript and modern web development.',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
            },
            {
                name: 'Bob Smith',
                email: 'bob@example.com',
                bio: 'Backend engineer specializing in Node.js and database optimization.',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
            },
            {
                name: 'Carol Davis',
                email: 'carol@example.com',
                bio: 'Frontend designer and developer with a focus on user experience.',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
            },
            {
                name: 'David Wilson',
                email: 'david@example.com',
                bio: 'DevOps engineer and cloud architecture enthusiast.',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
            }
        ]).returning();

        console.log(`✅ Created ${users.length} users`);

        // Create categories
        const categories = await db.insert(schema.categories).values([
            {
                name: 'Technology',
                description: 'Articles about the latest in tech',
                slug: 'technology',
                color: '#3b82f6'
            },
            {
                name: 'Web Development',
                description: 'Frontend and backend development topics',
                slug: 'web-development',
                color: '#10b981'
            },
            {
                name: 'Database',
                description: 'Database design and optimization',
                slug: 'database',
                color: '#f59e0b'
            },
            {
                name: 'DevOps',
                description: 'Deployment and infrastructure',
                slug: 'devops',
                color: '#ef4444'
            }
        ]).returning();

        console.log(`✅ Created ${categories.length} categories`);

        // Create tags
        const tags = await db.insert(schema.tags).values([
            { name: 'TypeScript', slug: 'typescript' },
            { name: 'Node.js', slug: 'nodejs' },
            { name: 'React', slug: 'react' },
            { name: 'PostgreSQL', slug: 'postgresql' },
            { name: 'Express', slug: 'express' },
            { name: 'API', slug: 'api' },
            { name: 'REST', slug: 'rest' },
            { name: 'Docker', slug: 'docker' },
            { name: 'AWS', slug: 'aws' },
            { name: 'Performance', slug: 'performance' }
        ]).returning();

        console.log(`✅ Created ${tags.length} tags`);

        // Create posts
        const posts = await db.insert(schema.posts).values([
            {
                title: 'Getting Started with Drizzle ORM',
                content: `# Getting Started with Drizzle ORM

Drizzle ORM is a modern TypeScript ORM that provides excellent type safety and developer experience. In this post, we'll explore how to set up and use Drizzle in your next project.

## Why Drizzle?

- **Type Safety**: Full TypeScript support with runtime validation
- **Performance**: Zero-cost abstractions and efficient queries
- **Developer Experience**: Intuitive API and excellent tooling

## Setup

First, install the required packages:

\`\`\`bash
npm install drizzle-orm drizzle-kit
\`\`\`

Then configure your database connection and schema...`,
                excerpt: 'Learn how to set up and use Drizzle ORM in your TypeScript projects with this comprehensive guide.',
                slug: 'getting-started-with-drizzle-orm',
                published: 1,
                authorId: users[0].id
            },
            {
                title: 'Building REST APIs with Express and TypeScript',
                content: `# Building REST APIs with Express and TypeScript

Express.js remains one of the most popular choices for building REST APIs in Node.js. When combined with TypeScript, it provides a robust foundation for scalable applications.

## Project Setup

Setting up a new Express + TypeScript project involves several steps:

1. Initialize your project
2. Install dependencies
3. Configure TypeScript
4. Set up your project structure

Let's walk through each step...`,
                excerpt: 'A complete guide to building type-safe REST APIs using Express.js and TypeScript.',
                slug: 'building-rest-apis-with-express-typescript',
                published: 1,
                authorId: users[1].id
            },
            {
                title: 'Database Performance Optimization Tips',
                content: `# Database Performance Optimization Tips

Database performance is crucial for any application. Here are some proven strategies to optimize your database queries and improve overall performance.

## Indexing Strategies

Proper indexing is the foundation of database performance:

- Use composite indexes for multi-column queries
- Avoid over-indexing write-heavy tables
- Monitor index usage regularly

## Query Optimization

- Use EXPLAIN to analyze query plans
- Avoid N+1 queries
- Consider query result caching`,
                excerpt: 'Essential tips and strategies for optimizing database performance in production applications.',
                slug: 'database-performance-optimization-tips',
                published: 1,
                authorId: users[1].id
            },
            {
                title: 'Modern Frontend Development with React',
                content: `# Modern Frontend Development with React

React continues to evolve with new features and patterns. This post covers the latest best practices for building modern React applications.

## Hooks and Functional Components

The shift to functional components and hooks has transformed how we write React:

- useState for local state management
- useEffect for side effects
- Custom hooks for reusable logic

## Performance Optimization

- Use React.memo for component memoization
- Implement proper key props for lists
- Consider code splitting with React.lazy`,
                excerpt: 'Explore modern React development patterns and best practices for building scalable applications.',
                slug: 'modern-frontend-development-react',
                published: 0, // Draft
                authorId: users[2].id
            },
            {
                title: 'Docker for Node.js Applications',
                content: `# Docker for Node.js Applications

Containerizing Node.js applications with Docker provides consistency across development and production environments.

## Creating a Dockerfile

Here's a basic Dockerfile for a Node.js application:

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

## Best Practices

- Use multi-stage builds for smaller images
- Leverage Docker layer caching
- Set proper health checks`,
                excerpt: 'Learn how to containerize your Node.js applications effectively using Docker.',
                slug: 'docker-for-nodejs-applications',
                published: 1,
                authorId: users[3].id
            }
        ]).returning();

        console.log(`✅ Created ${posts.length} posts`);

        // Create post-category relationships
        await db.insert(schema.postCategories).values([
            { postId: posts[0].id, categoryId: categories[0].id }, // Drizzle -> Technology
            { postId: posts[0].id, categoryId: categories[2].id }, // Drizzle -> Database
            { postId: posts[1].id, categoryId: categories[1].id }, // Express -> Web Development
            { postId: posts[2].id, categoryId: categories[2].id }, // Performance -> Database
            { postId: posts[3].id, categoryId: categories[1].id }, // React -> Web Development
            { postId: posts[4].id, categoryId: categories[3].id }, // Docker -> DevOps
        ]);

        // Create post-tag relationships
        await db.insert(schema.postTags).values([
            { postId: posts[0].id, tagId: tags.find(t => t.slug === 'typescript')!.id },
            { postId: posts[0].id, tagId: tags.find(t => t.slug === 'postgresql')!.id },
            { postId: posts[1].id, tagId: tags.find(t => t.slug === 'typescript')!.id },
            { postId: posts[1].id, tagId: tags.find(t => t.slug === 'nodejs')!.id },
            { postId: posts[1].id, tagId: tags.find(t => t.slug === 'express')!.id },
            { postId: posts[1].id, tagId: tags.find(t => t.slug === 'api')!.id },
            { postId: posts[1].id, tagId: tags.find(t => t.slug === 'rest')!.id },
            { postId: posts[2].id, tagId: tags.find(t => t.slug === 'postgresql')!.id },
            { postId: posts[2].id, tagId: tags.find(t => t.slug === 'performance')!.id },
            { postId: posts[3].id, tagId: tags.find(t => t.slug === 'react')!.id },
            { postId: posts[3].id, tagId: tags.find(t => t.slug === 'typescript')!.id },
            { postId: posts[4].id, tagId: tags.find(t => t.slug === 'nodejs')!.id },
            { postId: posts[4].id, tagId: tags.find(t => t.slug === 'docker')!.id },
        ]);

        // Create comments
        const commentsResult = await db.insert(schema.comments).values([
            {
                content: 'Great introduction to Drizzle! I\'ve been looking for a TypeScript-first ORM.',
                postId: posts[0].id,
                authorId: users[1].id
            },
            {
                content: 'Thanks for the detailed setup guide. The type safety features are impressive.',
                postId: posts[0].id,
                authorId: users[2].id
            },
            {
                content: 'This is exactly what I needed for my Express API project. Thanks!',
                postId: posts[1].id,
                authorId: users[0].id
            },
            {
                content: 'The indexing strategies section was particularly helpful. Any thoughts on partial indexes?',
                postId: posts[2].id,
                authorId: users[3].id
            },
            {
                content: 'Docker has been a game-changer for our deployment process. Great writeup!',
                postId: posts[4].id,
                authorId: users[0].id
            }
        ]).returning();

        const commentsArray = Array.isArray(commentsResult) ? commentsResult : [commentsResult];
        console.log(`✅ Created ${commentsArray.length} comments`);

        // Create some nested comments (replies)
        if (commentsArray.length > 3) {
            await db.insert(schema.comments).values([
                {
                    content: 'Partial indexes are great for conditional data! I should cover that in a follow-up post.',
                    postId: posts[2].id,
                    authorId: users[1].id, // Original author replying
                    parentId: commentsArray[3].id
                }
            ]);
        }

        console.log('🎉 Database seeded successfully!');
        console.log('📊 Summary:');
        console.log(`   Users: ${users.length}`);
        console.log(`   Categories: ${categories.length}`);
        console.log(`   Tags: ${tags.length}`);
        console.log(`   Posts: ${posts.length}`);
        console.log(`   Comments: ${commentsArray.length + 1}`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
