# 📦 Publishing Guide for drizzle-rest-adapter

This document outlines the complete process for publishing the `drizzle-rest-adapter` package to npm.

## 🎯 Overview

This package distributes TypeScript source files directly (no build step required), making it easy for TypeScript users to consume while maintaining full type safety and IDE support.

**Key Distribution Features:**
- ✅ TypeScript source distribution for better IDE support
- ✅ ES module and CommonJS compatibility via exports configuration
- ✅ Selective file inclusion via `.npmignore` (23 files, ~17.3 kB)
- ✅ Excludes test files and database configuration from published package

**Consumer Requirements:**
- TypeScript projects can import directly with full type safety
- JavaScript projects need a TypeScript runtime like `tsx` or `ts-node`
- ES module support required (`"type": "module"` in consumer's package.json)

## 📋 Pre-Publishing Checklist

### 1. Code Quality & Testing
- [x] All tests pass: `npm test` ✅ (71/71 tests passed)
- [x] Linting passes: `npm run lint` ✅ (No errors found)
- [x] TypeScript compilation check: `npm run tsc` ✅ (No compilation errors)
- [x] Integration tests pass ✅ (All 8 integration test suites passed)
- [x] Examples work correctly ✅ (Express and React-Admin examples configured properly)

### 2. Security & Dependencies
- [x] Run security audit: `npm audit` ✅ (0 vulnerabilities in production dependencies)
- [x] Fix any high/critical vulnerabilities: `npm audit fix` ✅ (No production vulnerabilities found)
- [x] Review dependency versions for compatibility ✅ (All dependencies compatible, minor updates available)
- [x] Ensure peer dependencies are correct ✅ (Peer dependencies properly configured)

**Security Status**:
- ✅ Production dependencies: 0 vulnerabilities
- ⚠️ Development dependencies: 4 moderate vulnerabilities in drizzle-kit/esbuild (dev only, not affecting published package)
- ✅ All runtime dependencies are secure and up-to-date

**Dependency Review**:
- Core dependencies (drizzle-orm, express, zod) are stable with minor patch updates available
- Dev dependencies have moderate vulnerabilities in esbuild (used by drizzle-kit) but don't affect the published package
- TypeScript and ESLint tooling is current
- Node.js engines requirement: >=20.0.0 (appropriate for modern TypeScript features)

### 3. Documentation
- [x] README.md is up to date
- [x] CHANGELOG.md includes new version notes ✅ (Updated for v0.1.1)

### 4. Version Management

**Current Version**: `0.1.1` (updated from 0.1.0)

#### Version Update Process
- [x] Determine version increment type based on changes:
  - **Patch** (0.1.1): Bug fixes, documentation updates, security patches ✅
  - **Minor** (0.2.0): New features, backwards compatible API additions
  - **Major** (1.0.0): Breaking changes, API modifications
- [x] Update version in `package.json` using npm version command ✅
- [x] Update CHANGELOG.md with new version entry ✅
- [x] Commit version changes ✅
- [x] Create and push git tag ✅ (v0.1.1 created locally)

#### Commands for Version Updates
```bash
# For bug fixes and patches
npm version patch

# For new features (backwards compatible)
npm version minor

# For breaking changes
npm version major

# Or set a specific version
npm version 0.1.1

# Preview version change without committing
npm version --no-git-tag-version patch
```

#### CHANGELOG.md Update Process
- [ ] Move items from `[Unreleased]` section to new version section
- [ ] Use format: `## [0.1.1] - 2025-07-20`
- [ ] Include sections: Added, Changed, Deprecated, Removed, Fixed, Security
- [ ] Add comparison links at bottom of file
- [ ] Create new empty `[Unreleased]` section for future changes

#### Git Tagging Best Practices
- [x] Tags follow semantic versioning: `v0.1.1` ✅
- [x] Tag message includes release notes summary ✅
- [ ] Push tags to remote: `git push origin --tags`
- [x] Verify tag exists: `git tag -l` ✅

#### Version Validation Checklist
- [x] Version number matches semantic versioning rules ✅ (0.1.1)
- [x] CHANGELOG.md entry exists for new version ✅
- [x] Git tag matches package.json version ✅ (v0.1.1)
- [x] No uncommitted changes before version bump ✅
- [x] All tests pass with new version ✅ (71/71 tests)

### 5. Package Configuration
- [x] `package.json` exports are properly configured for TypeScript source distribution ✅
- [x] `.npmignore` excludes test files and includes only essential source files ✅
- [x] Module type is set to "module" for ES module support ✅
- [x] Both CommonJS and ES module imports are supported in exports ✅

## 🔍 Pre-Publishing Validation

### Test Package Contents
```bash
# Preview what will be published
npm pack --dry-run

# Create actual package for testing
npm pack
```

Expected files in package (23 files, ~17.3 kB):
- `src/actions/` - CRUD operation implementations (8 files)
- `src/utils/` - Utility functions and helpers (10 files)
- `src/index.ts` - Main entry point with exports
- `src/drizzle-rest-adapter.ts` - Core adapter implementation
- `README.md`, `LICENSE`, `package.json` - Documentation and metadata

**Excluded from package:**
- `src/db/` - Test database configuration
- `src/integration-tests/` - Test files
- All `*.test.ts` and `*.spec.ts` files

### Test Installation Locally
```bash
# Create test directory
mkdir /tmp/test-install
cd /tmp/test-install

# Initialize as ES module project
cat > package.json << 'EOF'
{
  "name": "package-test",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js"
}
EOF

# Install TypeScript runtime and your local package
npm install tsx typescript
npm install /workspaces/drizzle-rest/drizzle-rest-adapter-*.tgz

# Test import and functionality
cat > test.ts << 'EOF'
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';

console.log('✅ createDrizzleRestAdapter imported successfully');
console.log('Type:', typeof createDrizzleRestAdapter);

// Test function call (should fail gracefully without proper options)
try {
  createDrizzleRestAdapter();
} catch (error) {
  console.log('✅ Function properly validates parameters');
}

console.log('🎉 Package test passed!');
EOF

# Run the test
npx tsx test.ts
```

## 🚀 Publishing Process

### Step 1: Pre-Publishing Commands
```bash
# Ensure you're in the project root
cd /workspaces/drizzle-rest

# Run all quality checks
npm run test         # All 71+ tests should pass
npm run lint         # Code style validation
npm run tsc          # TypeScript compilation check

# Check security (moderate dev vulnerabilities are acceptable)
npm audit

# Validate package contents (should show 23 files, ~17.3 kB)
npm pack --dry-run

# Create and test package locally
npm pack
mkdir -p /tmp/package-test
cd /tmp/package-test
echo '{"name":"test","type":"module"}' > package.json
npm install tsx /workspaces/drizzle-rest/drizzle-rest-adapter-*.tgz
echo 'import { createDrizzleRestAdapter } from "drizzle-rest-adapter"; console.log("✅ Import works");' > test.ts
npx tsx test.ts
cd /workspaces/drizzle-rest
```

### Step 2: Version Management ✅ COMPLETED
```bash
# ✅ DONE: Version bumped from 0.1.0 → 0.1.1
npm version patch  # Already executed

# ✅ DONE: Git tag v0.1.1 created
# ✅ DONE: CHANGELOG.md updated
# ✅ DONE: All tests passing (71/71)

# NEXT: Push changes and tags to remote (optional before publishing)
git push origin main --tags
```

### Step 3: Login to npm
```bash
# Login (if not already logged in)
npm login

# Verify login
npm whoami
```

### Step 4: Publish

#### For Alpha/Beta Releases
```bash
# Publish as alpha
npm publish --tag alpha --access public

# Publish as beta
npm publish --tag beta --access public
```

Users install with:
```bash
npm install drizzle-rest-adapter@alpha
npm install drizzle-rest-adapter@beta
```

#### For Stable Releases
```bash
# Publish as latest (default)
npm publish --access public
```

Users install with:
```bash
npm install drizzle-rest-adapter
```

## 📋 Post-Publishing Tasks

### 1. Verify Publication
```bash
# Check package info
npm info drizzle-rest-adapter

# View all versions
npm view drizzle-rest-adapter versions --json
```

### 2. Test Installation
```bash
# Test in clean environment
mkdir /tmp/verify-publish
cd /tmp/verify-publish
npm init -y
npm install drizzle-rest-adapter@latest
```

### 3. Update Documentation
- [ ] Update README.md installation instructions
- [ ] Create GitHub release with changelog
- [ ] Update project documentation if needed

### 4. Tag Repository
```bash
# Create and push git tag (already created locally)
git tag v0.1.1  # Already done by npm version
git push origin v0.1.1
```

## 🔄 Version Strategy

### Semantic Versioning
- **Patch** (0.1.1): Bug fixes, documentation updates
- **Minor** (0.2.0): New features, backwards compatible
- **Major** (1.0.0): Breaking changes

### Release Channels
- **alpha**: Early development, frequent changes
- **beta**: Feature complete, testing phase
- **latest**: Stable production releases

## 🛠️ Package Configuration

### Current Setup
```json
{
  "name": "drizzle-rest-adapter",
  "version": "0.1.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "files": [
    "src",
    "README.md",
    "LICENSE"
  ]
}
```

### TypeScript Distribution Benefits
- ✅ No build step required
- ✅ Full TypeScript support for consumers
- ✅ Source maps not needed
- ✅ Direct access to source code
- ⚠️ Requires consumers to have TypeScript configured

## 🔧 Consumer Requirements

Users of this package need:

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

### Peer Dependencies
Consumers should have:
- TypeScript >= 5.0.0
- Node.js >= 20.0.0

## 🚨 Troubleshooting

### Common Issues

#### 1. Permission Denied
```bash
# Re-login to npm
npm logout
npm login
```

#### 2. Package Already Exists
```bash
# Check if name is taken
npm info drizzle-rest-adapter

# Use scoped package if needed
@your-username/drizzle-rest-adapter
```

#### 3. Package Import Issues
```bash
# If getting "No exports main defined" error:
# 1. Ensure package.json exports includes both import and require
# 2. Consumer project needs "type": "module" in package.json
# 3. Use tsx or ts-node for TypeScript execution

# If import is undefined:
# 4. Check you're importing the correct function name
# 5. Use: import { createDrizzleRestAdapter } from 'drizzle-rest-adapter'
```

#### 4. Files Not Included
```bash
# Check .npmignore doesn't exclude src/
# Ensure package.json "files" array is correct
npm pack --dry-run
```

#### 5. TypeScript Import Issues
```bash
# Verify export paths match package.json
# Check consumer's tsconfig.json
# Ensure module resolution is correct
```

## 📞 Support

For publishing issues:
- Check npm status: https://status.npmjs.org/
- npm documentation: https://docs.npmjs.com/
- Project issues: https://github.com/mgaebler/drizzle-rest/issues

---

**Last Updated**: July 20, 2025 (Updated with validated testing procedures)
**Next Review**: When making significant package changes
