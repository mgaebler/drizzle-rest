import type { Config } from "drizzle-kit";

export default {
    schema: "./backend/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    driver: "pglite",
} satisfies Config;
