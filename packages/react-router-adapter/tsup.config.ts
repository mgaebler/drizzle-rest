import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node22',   // Node ≥22
    platform: 'node',   // Node-Runtime
    outDir: 'dist',
    treeshake: true,
    splitting: false     // optional; bei Libs oft angenehmer
    // external: []       // optional: libs hier explizit extern lassen
})