/**
 * One-off: applies the GiftSet migration via the Neon serverless driver
 * (port 443/WebSocket) and records it in _prisma_migrations so that
 * `prisma migrate deploy` won't try to re-apply it later.
 *
 * Run: pnpm --filter @aranya/backend exec tsx prisma/apply-gift-migration.ts
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
    console.log('🔧 Applying GiftSet migration…');

    await sql`
        CREATE TABLE IF NOT EXISTS "GiftSet" (
            "id"        TEXT NOT NULL,
            "slug"      TEXT NOT NULL,
            "name"      TEXT NOT NULL,
            "featured"  BOOLEAN NOT NULL DEFAULT false,
            "tagline"   TEXT NOT NULL,
            "blurb"     TEXT NOT NULL,
            "badge"     TEXT,
            "jar"       TEXT NOT NULL DEFAULT '50g',
            "color"     TEXT NOT NULL DEFAULT '#B5651D',
            "base"      TEXT NOT NULL DEFAULT '#C2772E',
            "deep"      TEXT NOT NULL DEFAULT '#7E481A',
            "surface"   TEXT NOT NULL DEFAULT '#F3E7D4',
            "usd"       TEXT NOT NULL,
            "lkr"       TEXT NOT NULL,
            "contents"  TEXT[] NOT NULL,
            "status"    "BlogStatus" NOT NULL DEFAULT 'PUBLISHED',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "GiftSet_pkey" PRIMARY KEY ("id")
        )
    `;
    console.log('  ✓ Table created');

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS "GiftSet_slug_key" ON "GiftSet"("slug")`;
    await sql`CREATE INDEX IF NOT EXISTS "GiftSet_status_featured_idx" ON "GiftSet"("status", "featured")`;
    console.log('  ✓ Indexes created');

    // Register in _prisma_migrations so migrate deploy skips it
    const migrationName = '20260619110000_add_gift_set_model';
    const existing = await sql`
        SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = ${migrationName} LIMIT 1
    `;
    if (existing.length === 0) {
        await sql`
            INSERT INTO "_prisma_migrations" (
                "id", "checksum", "finished_at", "migration_name",
                "logs", "rolled_back_at", "started_at", "applied_steps_count"
            ) VALUES (
                gen_random_uuid()::text,
                'manual',
                now(),
                ${migrationName},
                NULL,
                NULL,
                now(),
                1
            )
        `;
    }
    console.log('  ✓ Recorded in _prisma_migrations');
    console.log('\n✅ GiftSet migration applied');
}

main().catch((e) => { console.error(e); process.exit(1); });
