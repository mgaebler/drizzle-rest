import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
// import pluginDrizzle from 'eslint-plugin-drizzle';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: [
            'examples/**',
            '**/dist/**',
            '**/build/**',
            '**/node_modules/**'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        plugins: {
            '@stylistic': stylistic,
            // drizzle: pluginDrizzle,
            'simple-import-sort': pluginSimpleImportSort,
        },
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
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
            }],
        },
    },
];
