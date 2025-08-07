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

## Available Scripts

### Development & Testing
- `npm run dev` - Development mode with hot reload
- `npm start` - Start the application
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run tsc` - TypeScript type checking

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run unused-exports` - Find unused exports
- `npm run unused-exports:custom` - Custom unused exports script

### Build & Verification
- `npm run build` - Build (TypeScript source distribution)
- `npm run build:check` - Full check: TypeScript + lint + test
- `npm run ci` - CI pipeline: build check + package verification
- `npm run package:test` - Test the npm package
- `npm run package:verify` - Verify package contents (dry run)

### Database
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run Drizzle migrations

### Release & Publishing
- `npm run prerelease` - Pre-release checks
- `npm run release:alpha` - Release alpha version
- `npm run release:beta` - Release beta version
- `npm run release:patch` - Release patch version
- `npm run release:minor` - Release minor version
- `npm run release:major` - Release major version

### Security & Maintenance
- `npm run security:check` - Run security audit
- `npm run security:fix` - Fix security vulnerabilities
- `npm run clean` - Clean and reinstall dependencies

### Dependency Analysis
- `npm run deps:graph` - Generate dependency graph (all src)
- `npm run deps:graph:core` - Generate dependency graph (core only)

