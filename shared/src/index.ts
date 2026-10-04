// Shared Zod schemas and TypeScript types used by both the API and the storefront.
// Rebuild with `pnpm --filter @aranya/shared build` after editing; dist/ is not committed.

export const SHARED_VERSION = '0.0.1';

export * from './schemas/auth.schema.js';
export * from './schemas/product.schema.js';
export * from './schemas/cart.schema.js';export * from './schemas/page.schema.js';
