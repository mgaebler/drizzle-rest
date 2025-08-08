# 🛠️ Monorepo Migration Spec with pnpm & npm Publishing

This document outlines how to convert an existing single-package JavaScript/TypeScript project into a pnpm-managed monorepo, while
 keeping npm for package publishing.
---

## 🔧 Goals

1. **Introduce `pnpm` workspaces** to manage the monorepo.
2. **Move `src/` to `packages/core/`** to prepare it as a publishable package.
3. **Convert `examples/*` into independent packages**, depending on `@drizzle-rest/core`.
4. **Keep NPM as the tool for publishing `packages/core`**.
5. Ensure compatibility with TypeScript, Vitest, ESLint, and any existing scripts.

---

## 📁 New Project Structure

```
.
├── packages
│   ├── core
│   │   ├── src
│   │   ├── package.json         ← publishes to npm
│   │   ├── tsconfig.json        ← local config extending root
│   │   └── (core logic, types, utils)
│   └── adapters
│       ├── express
│       │   ├── src
│       │   ├── package.json     ← depends on @drizzle-rest/core
│       │   └── (express adapter code)
│       └── react-router
│           ├── src
│           ├── package.json     ← depends on @drizzle-rest/core
│           └── (react-router adapter code)
├── examples
│   ├── express
│   ├── react-admin
│   └── react-router-simple
├── docs
├── drizzle
├── scripts
├── pnpm-workspace.yaml
├── package.json                ← shared devDeps, scripts
├── tsconfig.base.json
└── ...
```

---

## 📄 File Changes

### 1. `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
  - "examples/*"
```

### 2. Root `package.json`

```json
{
  "name": "your-monorepo",
  "private": true,
  "workspaces": ["packages/*", "examples/*"],
  "devDependencies": {
    "typescript": "^5.4.5",
    "vitest": "^1.5.0",
    "eslint": "^8.50.0"
  },
  "scripts": {
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build"
  }
}
```

### 3. `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": "."
  }
}
```

### 4. `packages/core/package.json`

```json
{
  "name": "@drizzle-rest/core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --dts --out-dir dist",
    "test": "vitest",
    "lint": "eslint . --ext .ts"
  },
  "dependencies": {},
  "devDependencies": {
    "tsup": "^7.0.0"
  }
}
```

### 5. `packages/adapters/express/package.json`

```json
{
  "name": "@drizzle-rest/express-adapter",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --dts --out-dir dist",
    "test": "vitest",
    "lint": "eslint . --ext .ts"
  },
  "dependencies": {
    "@drizzle-rest/core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^7.0.0"
  }
}
```

### 6. `packages/adapters/react-router/package.json`

```json
{
  "name": "@drizzle-rest/react-router-adapter",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --dts --out-dir dist",
    "test": "vitest",
    "lint": "eslint . --ext .ts"
  },
  "dependencies": {
    "@drizzle-rest/core": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^7.0.0"
  }
}
```

### 7. `examples/*/package.json` (template)

```json
{
  "name": "example-express",
  "private": true,
  "version": "0.0.0",
  "dependencies": {
    "@drizzle-rest/core": "workspace:*",
    "@drizzle-rest/express-adapter": "workspace:*"
  },
  "scripts": {
    "dev": "node index.js"
  }
}
```

---

## ✅ Tasks to Implement

- [ ] Move core logic to `packages/core/src`
- [ ] Move each adapter to `packages/adapters/*/src`
- [ ] Add `package.json` in `packages/core` and each adapter
- [ ] Create `pnpm-workspace.yaml` at root
- [ ] Create or update `examples/*/package.json` with proper dependencies
- [ ] Rename `tsconfig.json` → `tsconfig.base.json` at root
- [ ] Add `tsconfig.json` in each package extending the base
- [ ] Run `pnpm install` to bootstrap the workspace
- [ ] Verify builds, tests, and linting for all packages
- [ ] Ensure `npm publish` works from each publishable directory

---
## ℹ️ Additional Notes

- Ensure the npm scope `@drizzle-rest` is registered and owned by your organization or account before publishing.

- To publish the core package, run:
  ```sh
  cd packages/core
  npm publish
  ```

- If using TypeScript project references, add a `references` array in `tsconfig.json` files as needed.

## 🛠️ Troubleshooting

- If you encounter issues with pnpm workspaces or symlinked dependencies, try running:
  ```sh
  pnpm install --force
  ```
- For publishing errors, verify your npm authentication and scope ownership.
- If TypeScript cannot resolve workspace packages, check `tsconfig.json` paths and references.
- [ ] Rename `tsconfig.json` → `tsconfig.base.json` at root
- [ ] Add individual `tsconfig.json` in `packages/core` and each adapter extending the base
- [ ] Use `pnpm install` to bootstrap the workspace
- [ ] Verify that each package builds, tests, and linting work
