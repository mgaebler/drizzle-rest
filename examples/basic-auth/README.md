# Basic Authentication Example

This example demonstrates how to use the Drizzle REST Adapter with JWT authentication and authorization hooks using TypeScript.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your database connection:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
export JWT_SECRET="your-secret-key"
```

3. Run the server:
```bash
# Development mode (with TypeScript compilation)
npm run dev

# Production mode
npm start
```

## Usage

### 1. Login to get a JWT token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Use the token to access protected endpoints
```bash
# Get all users (admin only)
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get your own profile
curl -X GET http://localhost:3000/api/v1/users/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new post (automatically sets authorId)
curl -X POST http://localhost:3000/api/v1/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"This is my post content"}'
```

## Authorization Rules

### Users
- **GET_MANY**: Admin only
- **GET_ONE**: Own profile or admin
- **UPDATE**: Own profile or admin
- **DELETE**: Admin only
- **Data Filtering**: Password field removed for non-admin users

### Posts
- **CREATE**: Auto-sets authorId to current user
- **UPDATE/DELETE**: Only author or admin can modify
- **GET**: All authenticated users can read

## Security Features

- JWT-based authentication
- Role-based access control
- Resource ownership validation
- Sensitive data filtering
- Automatic field population
- Full TypeScript support with type safety

## TypeScript Features

- Strongly typed request/response objects
- Type-safe database operations
- Inferred types from Drizzle schema
- Type-safe hook context

This example shows how to implement secure REST APIs with fine-grained authorization using hooks in a fully type-safe manner.
