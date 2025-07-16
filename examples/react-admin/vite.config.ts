import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react()],
    server: {
        host: true,
    },
    build: {
        sourcemap: mode === "development",
    },
    base: "./",
}));
