// app/entry.server.tsx
import { ServerRouter, type EntryContext } from "react-router";
import ReactDOMServer from "react-dom/server";
const { renderToReadableStream } = ReactDOMServer;
import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "./db/connection";
import { seedDatabase } from "./db/seed";
import path from "node:path";
import { fileURLToPath } from "node:url";

let _initPromise: Promise<void> | null = null;
async function initOnce() {
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        // Resolve migrations folder relative to this file
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const migrationsFolder = path.resolve(__dirname, "..", "drizzle");
        await migrate(db, { migrationsFolder });
        await seedDatabase();
    })();
    return _initPromise;
}

await initOnce();

export default async function handleRequest(
    request: Request,
    status: number,
    headers: Headers,
    context: EntryContext
) {
    const stream = await renderToReadableStream(
        <ServerRouter context={context} url={new URL(request.url)} />
    );
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new Response(stream, { status, headers });
}