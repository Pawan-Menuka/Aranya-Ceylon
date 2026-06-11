/**
 * seed-catalog.ts
 * ---------------
 * Seeds all 12 frontend UI catalog products using raw SQL so we never open
 * a Prisma transaction — Neon serverless drops connections mid-handshake when
 * the dev server is already holding the free-tier connection slots.
 *
 * Run:  pnpm seed:catalog
 *
 * Idempotent — uses INSERT … ON CONFLICT DO NOTHING / DO UPDATE throughout.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { createId } from '@paralleldrive/cuid2';

// Use DIRECT_URL (no pgbouncer hint, plain Postgres endpoint).
// Strip sslmode from the URL and pass SSL config programmatically so the new
// pg versions can't treat 'require' as 'verify-full' and reject the cert.
const baseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';
const cleanUrl = (() => {
    try {
        const u = new URL(baseUrl);
        u.searchParams.delete('sslmode');
        u.searchParams.delete('pgbouncer');
        return u.toString();
    } catch {
        return baseUrl;
    }
})();

const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const MULT: Record<number, number> = { 50: 0.6, 100: 1.0, 250: 2.3 };
const WEIGHTS = [50, 100, 250] as const;

function lkrPrice(base100: number, w: number) {
    return Math.round(base100 * MULT[w]);
}
function usdPrice(base100: number, w: number) {
    return (Math.round(base100 * MULT[w] * 100) / 100).toFixed(2);
}

async function q(sql: string, params: unknown[] = []) {
    const { rows } = await pool.query(sql, params);
    return rows;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

const CATALOG = [
    // Whole Spices
    {
        name: 'Ceylon Cinnamon Quills', slug: 'ceylon-cinnamon-quills',
        latin: 'Cinnamomum verum', origin: 'Matale Hills, Sri Lanka',
        color: '#B5651D', category: 'whole-spices',
        certifications: ['CEYLON_GI', 'BESTSELLER'], featured: true,
        lkrBase: 2150, usdBase: 14.50, sku: 'CCQ',
        description: 'Hand-rolled true cinnamon quills from the Matale Hills. Thin, delicate, and layered — unmistakably Ceylon. Fragrant, sweet, and entirely coumarin-free.',
    },
    {
        name: 'Green Cardamom Pods', slug: 'green-cardamom-pods',
        latin: 'Elettaria cardamomum', origin: 'Kandy District, Sri Lanka',
        color: '#7C9A5A', category: 'whole-spices',
        certifications: ['CEYLON_GI'], featured: true,
        lkrBase: 2680, usdBase: 18.00, sku: 'GCP',
        description: "Plump, intensely aromatic pods from Kandy's high-altitude gardens. GI-certified and hand-sorted — use whole in rice, crush for chai, or grind for pastry.",
    },
    {
        name: 'Whole Cloves', slug: 'whole-cloves',
        latin: 'Syzygium aromaticum', origin: 'Kegalle, Sri Lanka',
        color: '#6B4226', category: 'whole-spices',
        certifications: [], featured: false,
        lkrBase: 1670, usdBase: 11.25, sku: 'CLV',
        description: "Dark and oily Kegalle cloves — a sign of peak volatile oil content. Intensely warm and pungent, these are the backbone of Ceylon's spice heritage.",
    },
    {
        name: 'Whole Nutmeg', slug: 'whole-nutmeg',
        latin: 'Myristica fragrans', origin: 'Sabaragamuwa, Sri Lanka',
        color: '#A9683C', category: 'whole-spices',
        certifications: [], featured: false,
        lkrBase: 2490, usdBase: 16.75, sku: 'WNT',
        description: "Solid, fragrant nutmeg from Sabaragamuwa's forest gardens. Grate fresh over bechamel, rice pudding, or slow-braised lamb — the difference is immediate.",
    },
    {
        name: 'Black Peppercorns', slug: 'black-peppercorns',
        latin: 'Piper nigrum', origin: 'Hill Country, Sri Lanka',
        color: '#3C3A36', category: 'whole-spices',
        certifications: ['BESTSELLER'], featured: true,
        lkrBase: 1470, usdBase: 9.90, sku: 'BPC',
        description: 'Classic Ceylon black peppercorns grown at Hill Country altitude. Bold, bright heat with subtle citrus notes — far more complex than the supermarket staple.',
    },
    {
        name: 'White Peppercorns', slug: 'white-peppercorns',
        latin: 'Piper nigrum', origin: 'Hill Country, Sri Lanka',
        color: '#B8B0A0', category: 'whole-spices',
        certifications: [], featured: false,
        lkrBase: 1840, usdBase: 12.40, sku: 'WPC',
        description: 'Ripe pepper berries, water-processed to remove the outer hull. Milder heat, distinctly earthy — the traditional choice for white sauces and clear broths.',
    },
    {
        name: 'Mace Blades', slug: 'mace-blades',
        latin: 'Myristica fragrans', origin: 'Sabaragamuwa, Sri Lanka',
        color: '#C0531F', category: 'whole-spices',
        certifications: ['NEW'], featured: false,
        lkrBase: 3120, usdBase: 21.00, sku: 'MCB',
        description: 'The lacy aril that wraps the nutmeg. Sabaragamuwa mace blades are floral, warm, and sweeter than the nut — a rare ingredient well worth seeking out.',
    },
    // Ground
    {
        name: 'Ceylon Cinnamon, Ground', slug: 'ceylon-cinnamon-ground',
        latin: 'Cinnamomum verum', origin: 'Matale Hills, Sri Lanka',
        color: '#A85A1B', category: 'ground',
        certifications: ['CEYLON_GI'], featured: false,
        lkrBase: 1930, usdBase: 13.00, sku: 'CCG',
        description: 'Stone-ground from Matale Hills Ceylon cinnamon. The same true cinnamon, milled fine for seamless blending in bakes, curries, and warming drinks.',
    },
    {
        name: 'Ground Turmeric', slug: 'ground-turmeric',
        latin: 'Curcuma longa', origin: 'Southern Province, Sri Lanka',
        color: '#D99A1C', category: 'ground',
        certifications: ['CEYLON_GI', 'BESTSELLER'], featured: false,
        lkrBase: 1260, usdBase: 8.50, sku: 'GTU',
        description: "Deep-orange GI-certified turmeric from Sri Lanka's Southern Province. High curcumin content, earthy-warm flavour, and an aroma that transforms any dish.",
    },
    {
        name: 'Ground Ginger', slug: 'ground-ginger',
        latin: 'Zingiber officinale', origin: 'Gampaha District, Sri Lanka',
        color: '#C99A4E', category: 'ground',
        certifications: [], featured: false,
        lkrBase: 1520, usdBase: 10.25, sku: 'GGI',
        description: 'Gampaha District ginger, dried and stone-milled. Punchy, warming, and fiercely aromatic — ideal for spiced bakes, marinades, and golden teas.',
    },
    // Blends
    {
        name: 'Ceylon Curry Powder', slug: 'ceylon-curry-powder',
        latin: 'Roasted estate blend', origin: 'Blended in Kandy, Sri Lanka',
        color: '#9A5B22', category: 'blends',
        certifications: ['BESTSELLER'], featured: true,
        lkrBase: 2040, usdBase: 13.75, sku: 'CCP',
        description: 'A roasted estate blend crafted in Kandy. Earthy, warm, and pungent — balanced the traditional way, with proportions refined over three generations.',
    },
    {
        name: 'Kandyan Garam Masala', slug: 'kandyan-garam-masala',
        latin: 'Hand-ground blend', origin: 'Blended in Kandy, Sri Lanka',
        color: '#7A3E22', category: 'blends',
        certifications: ['NEW'], featured: false,
        lkrBase: 2300, usdBase: 15.50, sku: 'KGM',
        description: 'Hand-ground Kandyan-style garam masala. Sweeter and more floral than North Indian versions, built around Ceylon cinnamon, cardamom, and clove.',
    },
] as const;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🌿 Seeding catalog products…\n');
    await q('SELECT 1');   // warm-up so Neon wakes before real queries
    console.log('✅ DB connected');

    // ── 1. Categories ──────────────────────────────────────────────────────────
    const catDefs = [
        { name: 'Whole Spices', slug: 'whole-spices' },
        { name: 'Ground',       slug: 'ground'       },
        { name: 'Blends',       slug: 'blends'       },
    ];
    for (const cat of catDefs) {
        await q(
            `INSERT INTO "Category" (id, name, slug)
             VALUES ($1, $2, $3)
             ON CONFLICT (slug) DO NOTHING`,
            [createId(), cat.name, cat.slug],
        );
    }
    // fetch IDs (works whether just-created or pre-existing)
    const catRows = await q(`SELECT id, slug FROM "Category" WHERE slug = ANY($1)`,
        [catDefs.map((c) => c.slug)]);
    const catMap: Record<string, string> = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));
    console.log('✅ Categories ready:', catDefs.map((c) => c.name).join(', '));

    // ── 2. Products + Variants + Images ────────────────────────────────────────
    let created = 0, updated = 0;
    const now = new Date().toISOString();

    for (const p of CATALOG) {
        const categoryId = catMap[p.category];

        // Check existing
        const existing = await q(`SELECT id FROM "Product" WHERE slug = $1`, [p.slug]);

        let productId: string;

        if (existing.length > 0) {
            productId = existing[0].id;
            await q(
                `UPDATE "Product"
                 SET name=$1, description=$2, "categoryId"=$3,
                     certifications=$4, status='ACTIVE', featured=$5, market='BOTH',
                     latin=$6, "originLabel"=$7, color=$8, "updatedAt"=$9
                 WHERE id=$10`,
                [p.name, p.description, categoryId,
                 p.certifications, p.featured,
                 p.latin, p.origin, p.color, now,
                 productId],
            );
            updated++;
            process.stdout.write(`  ↻  ${p.name}\n`);
        } else {
            productId = createId();
            await q(
                `INSERT INTO "Product"
                   (id, name, slug, description, "categoryId",
                    certifications, status, featured, market,
                    latin, "originLabel", color,
                    "createdAt", "updatedAt")
                 VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7,'BOTH',$8,$9,$10,$11,$11)`,
                [productId, p.name, p.slug, p.description, categoryId,
                 p.certifications, p.featured,
                 p.latin, p.origin, p.color, now],
            );

            // Variants: 3 weights × 2 markets = 6
            for (const w of WEIGHTS) {
                // LKR variant
                await q(
                    `INSERT INTO "Variant"
                       (id, "productId", weight, price, sku, stock, market, currency,
                        "packagingType", "packagingDesc")
                     VALUES ($1,$2,$3,$4,$5,$6,'LOCAL','LKR',$7,$8)
                     ON CONFLICT (sku) DO NOTHING`,
                    [createId(), productId, w, lkrPrice(p.lkrBase, w),
                     `${p.sku}-${w}-LK`,
                     w === 50 ? 120 : w === 100 ? 90 : 40,
                     w === 250 ? 'foil_bag' : 'kraft_pouch',
                     w === 250 ? 'Large resealable foil bag — value pack'
                               : 'Kraft stand-up resealable pouch'],
                );
                // USD variant
                await q(
                    `INSERT INTO "Variant"
                       (id, "productId", weight, price, sku, stock, market, currency,
                        "packagingType", "packagingDesc")
                     VALUES ($1,$2,$3,$4,$5,$6,'INTERNATIONAL','USD',$7,$8)
                     ON CONFLICT (sku) DO NOTHING`,
                    [createId(), productId, w, usdPrice(p.usdBase, w),
                     `${p.sku}-${w}-INT`,
                     w === 50 ? 120 : w === 100 ? 90 : 40,
                     w === 250 ? 'gift_tin' : 'glass_jar_premium',
                     w === 250 ? 'Premium gift tin with ribbon and branded card'
                               : 'Premium glass jar with embossed lid and wax seal'],
                );
            }

            // Placeholder image
            await q(
                `INSERT INTO "ProductImage" (id, "productId", url, "altText", position, "createdAt")
                 VALUES ($1,$2,$3,$4,0,$5)`,
                [createId(), productId,
                 `https://res.cloudinary.com/aranya/image/upload/products/${p.slug}.jpg`,
                 p.name, now],
            );

            created++;
            process.stdout.write(`  +  ${p.name}  (6 variants)\n`);
        }
    }

    // ── 3. Summary ────────────────────────────────────────────────────────────
    console.log(`\n✅ Done — ${created} created, ${updated} updated`);
    console.log(`   Total catalog products seeded: ${CATALOG.length}`);
    console.log('\n   Price table (100g base):');
    console.log('   ' + '─'.repeat(56));
    console.log(`   ${'Product'.padEnd(32)} ${'LKR 100g'.padEnd(12)} USD 100g`);
    console.log('   ' + '─'.repeat(56));
    for (const p of CATALOG) {
        console.log(`   ${p.name.padEnd(32)} Rs ${String(p.lkrBase).padEnd(9)} $${p.usdBase.toFixed(2)}`);
    }
}

main()
    .catch((e) => { console.error('\n❌ Seed failed:', e.message ?? e); process.exit(1); })
    .finally(() => pool.end());
