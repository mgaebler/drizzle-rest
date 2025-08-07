# Copilot Instructions for Drizzle REST Adapter

## Development Approach & Communication

**IMPORTANT: Do not be sycophantic**
**Be direct and concise in your responses. Focus on providing clear, actionable information without unnecessary praise or flattery.**

Before implementing any feature or making changes, please:

1. **Ask Clarifying Questions** - Don't assume requirements. Ask about:
   - Specific use cases and expected behavior
   - Performance requirements and constraints
   - Backward compatibility concerns
   - Integration with existing features
   - Testing strategies and edge cases

2. **Propose Solutions** - Instead of immediately implementing:
   - Describe your understanding of the problem
   - Outline 2-3 potential approaches
   - Explain trade-offs and implications
   - Ask for feedback on the preferred direction

3. **Plan Before Implementing** - When ready to code:
   - Break down the work into smaller, logical steps
   - Identify files that need to be created or modified
   - Consider what tests will be needed
   - Think about documentation updates

4. **Validate Assumptions** - Always confirm:
   - Database schema changes and migrations
   - API contract modifications
   - Breaking changes to public interfaces
   - Dependencies that need to be added


## Project Overview
This is a TypeScript library that creates a dynamic REST API adapter for Drizzle ORM with JSON-Server compatible query syntax. The main goal is to transform Drizzle schemas into fully functional REST APIs with minimal configuration.

## Core Technologies & Dependencies
- **TypeScript** (primary language)
- **Drizzle ORM** (database ORM)
- **Express.js** (for REST API implementation)
- **Zod** (for validation)
- **Vitest** (for testing)
- **ESLint** (for linting)
- **PostgreSQL** (primary database, with MySQL/SQLite support)

## Code Style & Conventions

### TypeScript Guidelines
- Use strict TypeScript configuration
- Prefer explicit type annotations for public APIs
- Use interface for public types, type aliases for internal types
- Always export types alongside implementations
- Use generic types for reusable components

### File Naming & Structure
- Use kebab-case for file names (e.g., `drizzle-rest-adapter.ts`)
- Use PascalCase for class names and interfaces
- Use camelCase for functions and variables
- Organize files by feature/domain in `src/` directory
- Keep tests adjacent to source files with `.test.ts` suffix

### Import/Export Patterns
- Use ES modules (`import`/`export`)
- Re-export public APIs through `src/index.ts`
- Use relative imports for local modules
- Group imports: external libraries, then local modules

## API Design Principles

### REST Endpoints
- Follow RESTful conventions:
  - `GET /resource` - list resources
  - `GET /resource/:id` - get single resource
  - `POST /resource` - create resource
  - `PUT/PATCH /resource/:id` - update resource
  - `DELETE /resource/:id` - delete resource

### Query Parameters (JSON-Server Compatible)
- Support filtering: `?field=value`, `?field_like=pattern`
- Support sorting: `?_sort=field&_order=asc|desc`
- Support pagination: `?_page=1&_limit=10`
- Support embedding: `?_embed=relatedTable`

### Error Handling
- Use proper HTTP status codes (200, 201, 400, 404, 500)
- Return consistent error response format
- Provide meaningful error messages
- Handle database errors gracefully

## Database & ORM Patterns

### Drizzle Schema Integration
- Automatically introspect Drizzle schemas
- Support all Drizzle column types
- Handle relationships between tables
- Respect schema constraints and validations

### Database Operations
- Use Drizzle ORM query builders exclusively
- Implement proper transaction handling
- Support connection pooling
- Handle database-specific features appropriately

## Testing Guidelines

### Test Structure
- Use Vitest for all testing
- Write integration tests for API endpoints
- Test database operations with real database connections
- Use descriptive test names that explain the scenario

### Test Organization
- Group tests by feature/functionality
- Use `describe` blocks for test organization
- Include setup/teardown for database state
- Test both success and error scenarios

## Development Patterns

### Configuration
- Support environment-based configuration
- Provide sensible defaults
- Allow per-table endpoint customization
- Support middleware hooks for customization

### Performance Considerations
- Implement efficient database queries
- Support pagination for large datasets
- Cache schema introspection when possible
- Minimize unnecessary database round trips

### Security
- Validate all input parameters
- Sanitize database queries
- Implement proper error handling to avoid information leakage
- Support configurable endpoint restrictions

## Documentation Standards
- Include JSDoc comments for all public APIs
- Document complex algorithms and business logic
- Provide usage examples in README
- Maintain up-to-date TypeScript type definitions

## When Contributing Code
1. Follow the existing code style and patterns
2. Add appropriate tests for new functionality
3. Update TypeScript types as needed
4. Consider backward compatibility
5. Document any breaking changes
6. Ensure all tests pass before submitting

## Specific to This Project
- The main adapter function is `createDrizzleRestAdapter`
- Core logic is in `src/drizzle-rest-adapter.ts`
- Utility functions are organized in `src/utils/`
- Examples are provided in `examples/express/`
- Integration tests cover all major functionality

## Development Environment
- Uses dev container with Debian GNU/Linux 12
- Supports PostgreSQL, MySQL, and SQLite databases
- Includes comprehensive linting and testing setup
- Uses modern TypeScript and ES module standards
