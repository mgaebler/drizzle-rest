# Contributing to Drizzle REST Adapter

Thank you for your interest in contributing to Drizzle REST Adapter! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/drizzle-rest-adapter.git
   cd drizzle-rest-adapter
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 🛠️ Development Workflow

### Project Structure

```
src/
├── drizzle-rest-adapter.ts    # Main adapter implementation
├── index.ts                   # Public exports
├── utils/
│   ├── schema-inspector.ts    # Schema introspection
│   ├── query-builder.ts       # Query building
│   ├── query-parser.ts        # Parameter parsing
│   ├── filter-builder.ts      # Filter logic
│   ├── embed-builder.ts       # Relationship handling
│   └── error-handler.ts       # Error management
├── db/                        # Test database setup
└── tests/                     # Test suites
```

### Available Scripts

```bash
npm run dev          # Development mode with watch
npm run build        # Build for production
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
npm run lint:fix     # Auto-fix linting issues
```

## 🧪 Testing

### Running Tests

We use Vitest for testing with comprehensive integration and unit tests:

```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Run specific test file
npm test src/tests/crud.integration.test.ts
```

### Test Categories

1. **Integration Tests** (`src/tests/*.integration.test.ts`)
   - Full CRUD operations
   - JSON-Server query compatibility
   - Error handling scenarios

2. **Unit Tests** (`src/utils/*.test.ts`)
   - Individual component testing
   - Schema introspection
   - Query building logic

### Writing Tests

When adding new features, please include:

- **Integration tests** for new endpoints or query features
- **Unit tests** for new utility functions
- **Error scenario tests** for edge cases

Example test structure:

```typescript
describe('New Feature', () => {
  it('should handle basic case', async () => {
    // Test implementation
  });

  it('should handle edge cases', async () => {
    // Test edge cases
  });

  it('should return proper errors', async () => {
    // Test error scenarios
  });
});
```

## 📝 Code Style

### ESLint Configuration

We use ESLint with TypeScript rules. Run linting:

```bash
npm run lint      # Check for issues
npm run lint:fix  # Auto-fix issues
```

### Code Conventions

- **TypeScript**: Strict mode enabled
- **Async/Await**: Preferred over Promises
- **Error Handling**: Use ErrorHandler class for consistent errors
- **Naming**:
  - Classes: PascalCase (`QueryBuilder`)
  - Functions: camelCase (`buildQuery`)
  - Constants: UPPER_SNAKE_CASE (`DEFAULT_PAGE_SIZE`)

### Documentation

- **JSDoc**: Document public functions and classes
- **README**: Update examples for new features
- **CHANGELOG**: Add entries for all changes

## 🐛 Bug Reports

### Before Submitting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version**
3. **Reproduce with minimal example**

### Bug Report Template

```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Package version:
- Node.js version:
- Database type:
- Operating system:

## Minimal Example
```typescript
// Minimal code to reproduce
```

## Additional Context
Any additional information
```

## ✨ Feature Requests

### Before Submitting

1. **Check existing roadmap** in README.md
2. **Search existing feature requests**
3. **Consider if it fits project scope**

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed API
```typescript
// How would this feature be used?
```

## Implementation Ideas
Any thoughts on how this could be implemented

## Alternatives Considered
Other approaches you've considered
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create an issue** for discussion (for significant changes)
2. **Fork the repository**
3. **Create a feature branch** from `main`
4. **Write tests** for your changes
5. **Update documentation** if needed

### PR Guidelines

1. **Descriptive Title**: Clear summary of changes
2. **Detailed Description**: What changes were made and why
3. **Link Issues**: Reference related issues with `Fixes #123`
4. **Test Coverage**: Ensure tests pass and add new tests
5. **Documentation**: Update README, CHANGELOG, etc.

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (requires version bump)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Updated existing tests if needed

## Documentation
- [ ] Updated README if needed
- [ ] Updated CHANGELOG
- [ ] Added JSDoc for new functions

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] No console.log statements
- [ ] All tests pass
```

## 🏗️ Architecture Guidelines

### Core Principles

1. **Type Safety**: Full TypeScript coverage
2. **Modularity**: Separate concerns into focused modules
3. **Extensibility**: Design for future enhancements
4. **Performance**: Optimize query generation
5. **Compatibility**: Maintain JSON-Server compatibility

### Design Patterns

- **Builder Pattern**: For query construction
- **Factory Pattern**: For dynamic router creation
- **Strategy Pattern**: For different filter operators
- **Observer Pattern**: For future hook system

### Adding New Features

When implementing new features:

1. **Start with tests** - Define expected behavior
2. **Implement incrementally** - Small, focused changes
3. **Maintain compatibility** - Don't break existing APIs
4. **Document thoroughly** - Update all relevant docs
5. **Consider performance** - Profile query impact

## 🎯 Contribution Areas

### High Priority
- Hook system implementation
- Performance optimizations
- Advanced relationship queries
- Comprehensive documentation

### Medium Priority
- Additional filter operators
- Caching mechanisms
- Custom validation hooks
- Batch operations

### Low Priority
- Alternative query syntaxes
- Additional database adapters
- Admin UI integration
- Real-time features

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code contributions and discussions
- **Discussions**: General questions and ideas

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

Thank you for contributing to Drizzle REST Adapter! 🚀
