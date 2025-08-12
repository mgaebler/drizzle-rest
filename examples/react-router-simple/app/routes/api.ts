import type { ActionFunction, LoaderFunction } from "react-router";
import { adapter } from "../api-adapter.server";



// Simple loader: returns a static JSON response
export const loader: LoaderFunction = async (args) => {
    const foo = await adapter.handler(args);
    return foo;
};

