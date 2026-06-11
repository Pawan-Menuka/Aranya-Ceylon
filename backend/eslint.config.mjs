// ESLint flat config (required by ESLint v9+; replaces .eslintrc.json)
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
    { ignores: ['dist/**', 'node_modules/**'] },
    js.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            sourceType: 'module',
            globals: {
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                URL: 'readonly',
                TextEncoder: 'readonly',
            },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            // TypeScript itself catches undefined identifiers; no-undef false-positives on TS types
            'no-undef': 'off',
            // `declare global { namespace Express { ... } }` is the canonical way to extend req
            '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
        },
    },
];
