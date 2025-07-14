import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

// Users table - represents blog authors and commenters
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    bio: text('bio'),
    avatar: varchar('avatar', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Posts table - blog posts
export const posts = pgTable('posts', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    excerpt: text('excerpt'),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    published: integer('published').default(0).notNull(), // 0 = draft, 1 = published
    authorId: integer('author_id').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Comments table - post comments
export const comments: any = pgTable('comments', {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    postId: integer('post_id').references(() => posts.id).notNull(),
    authorId: integer('author_id').references(() => users.id).notNull(),
    parentId: integer('parent_id'), // For nested comments - will add reference after declaration
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Categories table - post categories
export const categories = pgTable('categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    color: varchar('color', { length: 7 }).default('#6366f1'), // Hex color
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tags table - post tags
export const tags = pgTable('tags', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Post-Category junction table (many-to-many)
export const postCategories = pgTable('post_categories', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => posts.id).notNull(),
    categoryId: integer('category_id').references(() => categories.id).notNull(),
});

// Post-Tag junction table (many-to-many)
export const postTags = pgTable('post_tags', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => posts.id).notNull(),
    tagId: integer('tag_id').references(() => tags.id).notNull(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
    posts: many(posts),
    comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
    author: one(users, {
        fields: [posts.authorId],
        references: [users.id],
    }),
    comments: many(comments),
    categories: many(postCategories),
    tags: many(postTags),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
    post: one(posts, {
        fields: [comments.postId],
        references: [posts.id],
    }),
    author: one(users, {
        fields: [comments.authorId],
        references: [users.id],
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
    }),
    replies: many(comments, {
        relationName: 'parentComment',
    }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
    posts: many(postCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    posts: many(postTags),
}));

export const postCategoriesRelations = relations(postCategories, ({ one }) => ({
    post: one(posts, {
        fields: [postCategories.postId],
        references: [posts.id],
    }),
    category: one(categories, {
        fields: [postCategories.categoryId],
        references: [categories.id],
    }),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
    post: one(posts, {
        fields: [postTags.postId],
        references: [posts.id],
    }),
    tag: one(tags, {
        fields: [postTags.tagId],
        references: [tags.id],
    }),
}));
