import { migrate } from "drizzle-orm/pglite/migrator";
import { createDrizzleRestAdapter, createLogger } from "drizzle-rest-adapter";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "./db/connection";
import * as schema from "./db/schema";
import { seedDatabase } from "./db/seed";

const app = express();
const PORT = process.env.PORT || 3000;

// Create a logger instance for development
const useDebugLogging = false; // Set to true for detailed logging
const logger = createLogger({
    level: useDebugLogging ? "debug" : "info",
    pretty: true,
    base: {
        environment: process.env.NODE_ENV || "development",
    },
});

// Basic middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from dist folder on /admin endpoint
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");
app.use("/admin", express.static(distPath));

async function startServer() {
    try {
        logger.info("🔄 Running database migrations...");
        await migrate(db, { migrationsFolder: "./drizzle" });

        logger.info("🌱 Seeding database...");
        await seedDatabase();

        // Create the REST API adapter with logging enabled
        const apiRouter = createDrizzleRestAdapter({
            db: db as unknown, // Cast to any to avoid type issues
            schema: schema,
            logging: {
                logger,
                requestLogging: {
                    enabled: true,
                    logQuery: true,
                    logBody: useDebugLogging, // Only log request bodies when debug logging is enabled
                    logResponseBody: false, // Keep response logging disabled for performance
                    logHeaders: useDebugLogging,
                },
            },
        });

        // Mount the API routes
        app.use("/api/v1", apiRouter);

        app.listen(Number(PORT), "0.0.0.0", () => {
            logger.info(
                {
                    port: PORT,
                    environment: process.env.NODE_ENV || "development",
                    debugLogging: useDebugLogging,
                },
                "🎉 Server started successfully!",
            );

            logger.info("🌐 Server running on http://0.0.0.0:" + PORT);

            if (useDebugLogging) {
                logger.debug(
                    "🐛 Debug logging enabled - you will see detailed request/response logs",
                );
            }
        });
    } catch (error) {
        logger.error(
            {
                error: error?.message || String(error),
                stack: error?.stack,
            },
            "❌ Failed to start server",
        );
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
    logger.info("📤 SIGTERM received. Shutting down gracefully...");
    process.exit(0);
});

process.on("SIGINT", () => {
    logger.info("📤 SIGINT received. Shutting down gracefully...");
    process.exit(0);
});

// Start the server
startServer();
