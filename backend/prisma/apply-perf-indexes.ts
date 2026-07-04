/**
 * One-off: applies the performance-index migration via the Neon serverless
 * driver (port 443/WebSocket) and records it in _prisma_migrations so that
 * `prisma migrate deploy` won't try to re-apply it later. Mirrors
 * apply-gift-migration.ts. All statements are IF NOT EXISTS — safe to re-run.
 *
 * Run: pnpm --filter @aranya/backend exec tsx prisma/apply-perf-indexes.ts
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
    console.log('🔧 Applying performance indexes…');

    // PERF-01 — recreate the dropped FTS GIN index + trgm index on name.
    await sql`CREATE INDEX IF NOT EXISTS "Product_searchVector_idx" ON "Product" USING GIN ("searchVector")`;
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    await sql`CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops)`;
    console.log('  ✓ FTS GIN + trgm indexes');

    // PERF-02 — FK indexes on hot join columns.
    await sql`CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")`;
    await sql`CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId")`;
    await sql`CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId")`;
    await sql`CREATE INDEX IF NOT EXISTS "OrderEvent_orderId_idx" ON "OrderEvent"("orderId")`;
    await sql`CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId")`;
    await sql`CREATE INDEX IF NOT EXISTS "Order_couponId_idx" ON "Order"("couponId")`;
    console.log('  ✓ FK indexes');

    // Register in _prisma_migrations so migrate deploy skips it.
    const migrationName = '20260704120000_add_perf_indexes';
    const existing = await sql`
        SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = ${migrationName} LIMIT 1
    `;
    if (existing.length === 0) {
        await sql`
            INSERT INTO "_prisma_migrations" (
                "id", "checksum", "finished_at", "migration_name",
                "logs", "rolled_back_at", "started_at", "applied_steps_count"
            ) VALUES (
                gen_random_uuid()::text, 'manual', now(), ${migrationName},
                NULL, NULL, now(), 1
            )
        `;
    }
    console.log('  ✓ Recorded in _prisma_migrations');
    console.log('\n✅ Performance indexes applied');
}

main().catch((e) => { console.error(e); process.exit(1); });
