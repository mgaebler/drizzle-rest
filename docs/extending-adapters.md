# Extending the Core REST Adapter

The `CoreRestAdapter` is designed as an abstract base class that framework-specific adapters should extend. This architecture provides a clean separation between the core REST logic and framework-specific concerns.

## Architecture Overview

```
┌─────────────────────────────────────┐
│        IFrameworkAdapter           │
│  (Framework-specific interface)    │
└─────────────────────────────────────┘
                    ▲
                    │ implements
                    │
┌─────────────────────────────────────┐
│        MyFrameworkAdapter          │
│  (Framework-specific adapter)      │
└─────────────────────────────────────┘
                    ▲
                    │ extends
                    │
┌─────────────────────────────────────┐
│        CoreRestAdapter             │
│     (Base class with core          │
│      REST logic)                   │
└─────────────────────────────────────┘
```

## Creating a Framework Adapter

To create a new framework adapter, you need to:

1. **Extend `CoreRestAdapter`** - This provides all the core REST functionality
2. **Implement `IFrameworkAdapter`** - This defines the framework-specific interface
3. **Implement required methods** - Convert between framework types and internal types

### Example: Creating a Custom Framework Adapter

```typescript
import { CoreRestAdapter, ICoreRestAdapterOptions, IFrameworkAdapter } from 'drizzle-rest-adapter';
import { IAdapterRequest, IAdapterResponse } from 'drizzle-rest-adapter/types';

export class MyFrameworkAdapter extends CoreRestAdapter implements IFrameworkAdapter {
    readonly name = 'my-framework';

    constructor(options: ICoreRestAdapterOptions) {
        super(options);
    }

    async parseRequest(frameworkReq: any): Promise<IAdapterRequest> {
        // Convert your framework's request object to the standard format
        return {
            method: frameworkReq.method,
            url: frameworkReq.url,
            headers: frameworkReq.headers || {},
            params: frameworkReq.params || {},
            query: frameworkReq.query || {},
            body: frameworkReq.body,
            requestId: frameworkReq.id || Math.random().toString(36).substring(7)
        };
    }

    async sendResponse(response: IAdapterResponse, frameworkRes: any): Promise<void> {
        // Send the response using your framework's response mechanism
        Object.entries(response.headers).forEach(([key, value]) => {
            frameworkRes.setHeader(key, value);
        });

        frameworkRes.status(response.status).json(response.body);
    }

    createHandler() {
        // Create a framework-specific handler that can be used with your framework
        return async (frameworkReq: any, frameworkRes: any) => {
            try {
                const adapterRequest = await this.parseRequest(frameworkReq);
                const adapterResponse = await this.handle(adapterRequest);
                await this.sendResponse(adapterResponse, frameworkRes);
            } catch (error: any) {
                this.getLogger().error({ error: error.message }, 'Handler error');
                frameworkRes.status(500).json({ error: 'Internal Server Error' });
            }
        };
    }
}
```

## Available Protected Methods

When extending `CoreRestAdapter`, you have access to these protected methods:

- `getLogger()` - Get the logger instance
- `setupRoutes()` - Set up all routes (called automatically)
- `registerTableRoutes()` - Register routes for a specific table
- `findMatchingRoute()` - Find a route that matches a request
- `normalizeUrlPath()` - Normalize URL paths
- `matchesPattern()` - Check if a path matches a route pattern
- `extractRouteParams()` - Extract parameters from a route

## Framework-Specific Concerns

Your framework adapter should handle:

1. **Request parsing** - Convert framework requests to `IAdapterRequest`
2. **Response sending** - Convert `IAdapterResponse` to framework responses
3. **Parameter extraction** - Extract route parameters
4. **Error handling** - Handle framework-specific error scenarios
5. **Middleware integration** - Integrate with framework middleware systems

## Examples

### Express.js Adapter

The included `ExpressAdapter` is a good reference implementation:

```typescript
export class ExpressAdapter extends CoreRestAdapter implements IFrameworkAdapter {
    readonly name = 'express';

    constructor(options: ICoreRestAdapterOptions) {
        super(options);
    }

    async parseRequest(req: ExpressRequest, params?: Record<string, string>): Promise<IAdapterRequest> {
        // Implementation details...
    }

    async sendResponse(response: IAdapterResponse, res: ExpressResponse): Promise<void> {
        // Implementation details...
    }

    createExpressHandler() {
        return async (req: ExpressRequest, res: ExpressResponse) => {
            // Framework-specific handler logic...
        };
    }
}
```

## Benefits of This Architecture

1. **Separation of Concerns** - Core REST logic is separate from framework details
2. **Reusability** - Core logic can be reused across different frameworks
3. **Testability** - Core logic can be tested independently
4. **Extensibility** - Easy to add support for new frameworks
5. **Type Safety** - Full TypeScript support with proper interfaces
6. **Consistency** - Same REST API behavior across all frameworks
