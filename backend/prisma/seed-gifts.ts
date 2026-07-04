/**
 * Seed script — imports gift set content into the GiftSet table.
 * Uses @neondatabase/serverless directly (no Prisma client / pg dependency).
 *
 * Run: pnpm --filter @aranya/backend exec tsx prisma/seed-gifts.ts
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const GIFTS = [
    {
        slug: 'classic',
        name: 'The Ceylon Classic',
        featured: true,
        tagline: 'The four cornerstones of a Sri Lankan pantry',
        blurb: 'Hand-rolled cinnamon, hill-country cardamom, Kegalle cloves and estate peppercorns — the spices every Ceylon kitchen is built on, presented in our signature ribboned box.',
        badge: 'Bestselling gift',
        jar: '50g',
        color: '#B5651D',
        base: '#C2772E',
        deep: '#7E481A',
        surface: '#F3E7D4',
        usd: '$28.50',
        lkr: 'Rs 4,250',
        contents: ['Ceylon Cinnamon Quills', 'Green Cardamom Pods', 'Whole Cloves', 'Black Peppercorns'],
    },
    {
        slug: 'curry',
        name: 'The Curry Night',
        featured: false,
        tagline: 'Everything for a proper black-curry table',
        blurb: 'Our roasted Ceylon curry powder and Kandyan garam masala, with turmeric and ginger to round the pot — a full night\'s cooking, boxed.',
        badge: null,
        jar: '50g',
        color: '#9A5B22',
        base: '#AC6C2D',
        deep: '#6E3F16',
        surface: '#EFE2CE',
        usd: '$25.50',
        lkr: 'Rs 3,800',
        contents: ['Ceylon Curry Powder', 'Kandyan Garam Masala', 'Ground Turmeric', 'Ground Ginger'],
    },
    {
        slug: 'baker',
        name: "The Baker's Box",
        featured: false,
        tagline: 'Warm, sweet spices for the oven',
        blurb: 'Ground cinnamon, whole nutmeg, delicate mace and green cardamom — the quiet backbone of every good bake, from spiced loaves to festive puddings.',
        badge: 'New',
        jar: '50g',
        color: '#C0531F',
        base: '#D06A2E',
        deep: '#8F3A14',
        surface: '#F4E0D2',
        usd: '$36.00',
        lkr: 'Rs 5,450',
        contents: ['Ceylon Cinnamon, Ground', 'Whole Nutmeg', 'Mace Blades', 'Green Cardamom Pods'],
    },
    {
        slug: 'connoisseur',
        name: 'The Connoisseur',
        featured: false,
        tagline: 'Six single-origin spices, at their finest',
        blurb: 'A larger keepsake box for the serious cook — six of our most prized lots, from rare mace blades to the bestselling roasted curry powder, each traceable to its estate.',
        badge: 'Limited',
        jar: '50g',
        color: '#6B4226',
        base: '#7A4A2A',
        deep: '#462914',
        surface: '#EBDDCD',
        usd: '$49.00',
        lkr: 'Rs 7,400',
        contents: ['Ceylon Cinnamon Quills', 'Green Cardamom Pods', 'Mace Blades', 'Whole Nutmeg', 'Black Peppercorns', 'Ceylon Curry Powder'],
    },
    {
        slug: 'taster',
        name: 'The Taster',
        featured: false,
        tagline: 'A first taste of the forest',
        blurb: 'Three icons to begin with — sweet Ceylon cinnamon, golden turmeric and hill-country pepper. The easiest way to send someone down the rabbit hole.',
        badge: null,
        jar: '50g',
        color: '#D99A1C',
        base: '#E2A62B',
        deep: '#A8740F',
        surface: '#F6E9C9',
        usd: '$17.50',
        lkr: 'Rs 2,600',
        contents: ['Ceylon Cinnamon Quills', 'Ground Turmeric', 'Black Peppercorns'],
    },
];

function makeId(): string {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// "$28.50" -> 28.5 ; "Rs 4,250" -> 4250
function parseMoney(s: string): number {
    return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
}

// Each gift set is backed by a real (but DRAFT, so catalog-hidden) Product with
// one Variant per market. This lets gift boxes flow through the exact same
// cart -> checkout -> stock -> order pipeline as any product, so they are
// actually purchasable and charged correctly. The link is by slug convention:
// the backing product's slug is `gift-<giftSlug>` (resolved in gift.controller).
const GIFT_BACKING_STOCK = 999;
async function seedGiftProducts(now: string) {
    console.log('🎁 Seeding gift backing products…');

    // A dedicated category keeps gift products grouped and easy to identify.
    const catRows = await sql`
        INSERT INTO "Category" ("id", "name", "slug")
        VALUES (${makeId()}, 'Gift Sets', 'gift-sets')
        ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name"
        RETURNING "id"
    ` as { id: string }[];
    const categoryId = catRows[0].id;

    for (const g of GIFTS) {
        const productSlug = `gift-${g.slug}`;
        const totalGrams = g.contents.length * (parseInt(g.jar, 10) || 50);

        const prodRows = await sql`
            INSERT INTO "Product" (
                "id", "name", "slug", "description", "categoryId", "certifications",
                "status", "market", "featured", "color", "originLabel",
                "createdAt", "updatedAt"
            ) VALUES (
                ${makeId()}, ${g.name}, ${productSlug}, ${g.blurb}, ${categoryId}, '{}'::text[],
                'DRAFT'::"ProductStatus", 'BOTH'::"Market", ${g.featured}, ${g.color}, 'Gift Set',
                ${now}::timestamptz, ${now}::timestamptz
            )
            ON CONFLICT ("slug") DO UPDATE SET
                "name"        = EXCLUDED."name",
                "description" = EXCLUDED."description",
                "categoryId"  = EXCLUDED."categoryId",
                "color"       = EXCLUDED."color",
                "featured"    = EXCLUDED."featured",
                "updatedAt"   = EXCLUDED."updatedAt"
            RETURNING "id"
        ` as { id: string }[];
        const productId = prodRows[0].id;

        // One variant per market so the market/currency guards resolve correctly.
        const variants = [
            { sku: `GIFT-${g.slug}-LKR`, price: parseMoney(g.lkr), market: 'LOCAL', currency: 'LKR' },
            { sku: `GIFT-${g.slug}-USD`, price: parseMoney(g.usd), market: 'INTERNATIONAL', currency: 'USD' },
        ];
        for (const v of variants) {
            await sql`
                INSERT INTO "Variant" (
                    "id", "productId", "weight", "price", "sku", "stock", "market", "currency"
                ) VALUES (
                    ${makeId()}, ${productId}, ${totalGrams}, ${v.price}, ${v.sku},
                    ${GIFT_BACKING_STOCK}, ${v.market}::"Market", ${v.currency}::"Currency"
                )
                ON CONFLICT ("sku") DO UPDATE SET
                    "productId" = EXCLUDED."productId",
                    "weight"    = EXCLUDED."weight",
                    "price"     = EXCLUDED."price",
                    "stock"     = EXCLUDED."stock",
                    "market"    = EXCLUDED."market",
                    "currency"  = EXCLUDED."currency"
            `;
        }
        console.log(`  ✓ ${g.name} → product ${productSlug} (LKR + USD variants)`);
    }
}

async function main() {
    console.log('🎁 Seeding gift sets…');
    const now = new Date().toISOString();

    for (const g of GIFTS) {
        await sql`
            INSERT INTO "GiftSet" (
                "id", "slug", "name", "featured", "tagline", "blurb", "badge",
                "jar", "color", "base", "deep", "surface", "usd", "lkr",
                "contents", "status", "createdAt", "updatedAt"
            ) VALUES (
                ${makeId()}, ${g.slug}, ${g.name}, ${g.featured}, ${g.tagline},
                ${g.blurb}, ${g.badge ?? null}, ${g.jar}, ${g.color}, ${g.base},
                ${g.deep}, ${g.surface}, ${g.usd}, ${g.lkr},
                ${g.contents}::text[],
                'PUBLISHED'::"BlogStatus", ${now}::timestamptz, ${now}::timestamptz
            )
            ON CONFLICT ("slug") DO UPDATE SET
                "name"      = EXCLUDED."name",
                "featured"  = EXCLUDED."featured",
                "tagline"   = EXCLUDED."tagline",
                "blurb"     = EXCLUDED."blurb",
                "badge"     = EXCLUDED."badge",
                "jar"       = EXCLUDED."jar",
                "color"     = EXCLUDED."color",
                "base"      = EXCLUDED."base",
                "deep"      = EXCLUDED."deep",
                "surface"   = EXCLUDED."surface",
                "usd"       = EXCLUDED."usd",
                "lkr"       = EXCLUDED."lkr",
                "contents"  = EXCLUDED."contents",
                "updatedAt" = EXCLUDED."updatedAt"
        `;
        console.log(`  ✓ ${g.name}`);
    }

    console.log(`\n✅ Seeded ${GIFTS.length} gift sets`);

    // Back each gift set with a purchasable (DRAFT, catalog-hidden) product.
    await seedGiftProducts(now);
    console.log(`✅ Seeded gift backing products`);
}

main().catch((e) => { console.error(e); process.exit(1); });
