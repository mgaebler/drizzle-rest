# Framework Agnostic Architecture

**Goal**: Decouple the adapter from Express.js and create a framework-agnostic core

**Deliverables Phase 4**:
- Abstract framework interface for router operations
- Framework-agnostic HTTP handler implementations
- Core adapter logic separated from framework-specific code
- Framework adapters for Express, Fastify, and Next.js
- Unified configuration interface across frameworks

**Key Architecture Changes**:
- Extract router logic into framework-agnostic handlers
- Create `FrameworkAdapter` interface for pluggable framework support
- Move Express-specific code to `/src/framework/express.ts`
- Implement framework detection or explicit framework selection
- Support for different HTTP abstraction patterns (req/res vs context objects)

