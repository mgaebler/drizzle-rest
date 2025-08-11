import type { ActionFunction, LoaderFunction } from "react-router";

import { db } from '../../app/db/connection';
import * as schema from '../../app/db/schema'
import { createReactRouterDrizzleRestAdapter } from "@drizzle-rest/react-router-adapter";

// Create the API route using our React Router adapter
const adapter = createReactRouterDrizzleRestAdapter({
    db: db as any,
    schema,
});

// Simple loader: returns a static JSON response
export const loader: LoaderFunction = async (args) => {
    const foo = adapter.handler(args);
    return foo;
};

