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
    splitting: false,
    skipNodeModulesBundle: true,
    external: [
        'pino',
        /^node:.*/
    ]
})