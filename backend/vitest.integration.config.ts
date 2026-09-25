import { defineConfig } from 'vitest/config';

const defaultIntegrationUrl = 'postgresql://aranya:aranya_test@localhost:55432/aranya_integration';

// Set these before test modules load. Explicit shell/CI values still win.
process.env.NODE_ENV = 'test';
process.env.DATABASE_ADAPTER = 'pg';
process.env.DATABASE_URL ??= defaultIntegrationUrl;
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.PAYMENTS_MODE = 'stub';

export default defineConfig({
    test: {
        include: ['src/**/*.integration.test.ts'],
        fileParallelism: false,
        maxWorkers: 1,
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
});
