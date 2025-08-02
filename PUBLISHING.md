# Publishing Guide

## Overview
TypeScript source distribution (no build step). Requires consumers to have TypeScript configured.

## Pre-Publishing
```bash
npm test && npm run lint && npm run tsc && npm audit
npm pack --dry-run  # Verify 23 files, ~17.3 kB
```

## Version Management
```bash
npm version patch|minor|major
npm version 0.1.1  # specific version
```

## Publishing

### Alpha/Beta Releases
```bash
npm publish --tag alpha --access public
npm publish --tag beta --access public
```

### Stable Release
```bash
npm publish --access public
```

## Post-Publishing
```bash
npm info drizzle-rest-adapter
git push origin main --tags
```

## Consumer Requirements
- TypeScript >= 5.0.0, Node.js >= 20.0.0
- `"type": "module"` in consumer's package.json
- ES module support required
