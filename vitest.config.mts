import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load tsconfig paths and convert to Vite aliases
const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'));
const paths = tsconfig.compilerOptions.paths as Record<string, string[]>;

const alias = Object.fromEntries(
    Object.entries(paths).map(([key, [value]]) => [
        key.replace('/*', ''),
        resolve(import.meta.dirname, value.replace('/*', '')),
    ]),
);

export default defineConfig({
    resolve: { alias },
    test: {
        setupFiles: ['./src/test-setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['html', 'text-summary'],
            reportsDirectory: './coverage/raspberry',
            exclude: ['**/*.html'],
        },
    },
});
