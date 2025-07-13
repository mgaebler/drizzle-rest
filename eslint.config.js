import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
// import pluginDrizzle from 'eslint-plugin-drizzle';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: {
            '@stylistic': stylistic,
            // drizzle: pluginDrizzle,
            'simple-import-sort': pluginSimpleImportSort,
        },
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        languageOptions: {
            globals: { ...globals.node },
        },
        rules: {
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            // 'drizzle/enforce-delete-with-where': 'error',
            // 'drizzle/enforce-update-with-where': 'error',
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
]);
