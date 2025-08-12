import { db } from './db/connection';
import * as schema from './db/schema'
import { createReactRouterDrizzleRestAdapter } from "@drizzle-rest/react-router-adapter";

// Create the API route using our React Router adapter
const adapter = createReactRouterDrizzleRestAdapter({
    db: db as any,
    schema,
    basePath: '/api',
});

export { adapter }