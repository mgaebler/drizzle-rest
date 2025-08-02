# Framework Agnostic Architecture

**Goal**: Decouple the adapter from Express.js and create a framework-agnostic core using Web Fetch API standards

**Deliverables Phase 4**:
- Abstract framework interface for router operations using Web Fetch API
- Framework-agnostic HTTP handler implementations based on Request/Response objects
- Core adapter logic separated from framework-specific code
- Framework adapters for Express, Fastify, and Next.js
- Unified configuration interface across frameworks

**Key Architecture Changes**:
- Use Web Fetch API `Request` and `Response` interfaces as common HTTP abstraction
- Extract router logic into framework-agnostic handlers that work with standard Request/Response
- Create `FrameworkAdapter` interface for converting framework-specific objects to/from Web API standards
- Move Express-specific code to `/src/framework/express.ts`
- Implement framework detection or explicit framework selection
- Standardize on Web API primitives for maximum compatibility and future-proofing

**Web Fetch API Benefits**:
- Universal standard supported across Node.js, Deno, Bun, and browsers
- Framework-agnostic by design
- Future-proof with evolving web standards
- Simplified testing with standard interfaces
- Better TypeScript support and IDE integration

## Implementation Strategy

### Core Handler Interface
```typescript
interface DrizzleRestHandler {
  handle(request: Request): Promise<Response>
}
```

### Framework Adapter Interface
```typescript
interface FrameworkAdapter {
  // Convert framework request to Web API Request
  toRequest(frameworkReq: any): Request

  // Send Web API Response through framework
  sendResponse(response: Response, frameworkRes: any): Promise<void>
}
```

### Framework-Specific Adapters

#### Express Adapter
- Convert Express `req` to Web API `Request`
- Stream Web API `Response` body to Express `res`
- Handle Express middleware integration

#### Fastify Adapter
- Convert Fastify `request` to Web API `Request`
- Send Web API `Response` through Fastify `reply`
- Support Fastify schema validation integration

#### Next.js Adapter
- Support both App Router and Pages Router
- Convert Next.js request objects to Web API `Request`
- Handle Next.js response patterns

### Migration Strategy
1. Create Web API-based core handlers
2. Implement framework adapters
3. Maintain backward compatibility during transition
4. Deprecate framework-specific APIs
5. Full migration to Web API standards

### Testing Benefits
- Use standard `Request`/`Response` objects in tests
- Framework-agnostic test suites
- Better mocking with standard interfaces
- Integration tests across multiple frameworks

