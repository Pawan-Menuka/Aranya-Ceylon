/**
 * dev-seed.routes.ts — ONE-TIME dev endpoint to seed the 12 catalog products.
 * Only active when ENABLE_DEV_ROUTES=true (fail closed).
 * POST /dev/seed-catalog
 *
 * Uses a dynamic import() for `prisma` so the main app's warm, already-
 * authenticated Neon connection is reused — no cold pool, no P1017.
 */

import { Router } from 'express';

const router = Router();

if (process.env.ENABLE_DEV_ROUTES === 'true') {

    const WEIGHTS = [50, 100, 250] as const;
    const MULT: Record<(typeof WEIGHTS)[number], number> = { 50: 0.6, 100: 1.0, 250: 2.3 };

    const CATALOG = [
        // ── Whole Spices ───────────────────────────────────────────────────────
        { name: 'Ceylon Cinnamon Quills',  slug: 'ceylon-cinnamon-quills',  latin: 'Cinnamomum verum',     origin: 'Matale Hills, Sri Lanka',      color: '#B5651D', cat: 'whole-spices', certs: ['CEYLON_GI','BESTSELLER'], featured: true,  lkr: 2150, usd: 14.50, sku: 'CCQ', desc: 'Hand-rolled true cinnamon quills from the Matale Hills. Thin, delicate, and layered — unmistakably Ceylon. Fragrant, sweet, and entirely coumarin-free.' },
        { name: 'Green Cardamom Pods',     slug: 'green-cardamom-pods',     latin: 'Elettaria cardamomum', origin: 'Kandy District, Sri Lanka',    color: '#7C9A5A', cat: 'whole-spices', certs: ['CEYLON_GI'],             featured: true,  lkr: 2680, usd: 18.00, sku: 'GCP', desc: "Plump, intensely aromatic pods from Kandy's high-altitude gardens. GI-certified and hand-sorted — use whole in rice, crush for chai, or grind for pastry." },
        { name: 'Whole Cloves',            slug: 'whole-cloves',            latin: 'Syzygium aromaticum',  origin: 'Kegalle, Sri Lanka',           color: '#6B4226', cat: 'whole-spices', certs: [],                        featured: false, lkr: 1670, usd: 11.25, sku: 'CLV', desc: "Dark and oily Kegalle cloves — a sign of peak volatile oil content. Intensely warm and pungent, these are the backbone of Ceylon's spice heritage." },
        { name: 'Whole Nutmeg',            slug: 'whole-nutmeg',            latin: 'Myristica fragrans',   origin: 'Sabaragamuwa, Sri Lanka',      color: '#A9683C', cat: 'whole-spices', certs: [],                        featured: false, lkr: 2490, usd: 16.75, sku: 'WNT', desc: "Solid, fragrant nutmeg from Sabaragamuwa's forest gardens. Grate fresh over bechamel, rice pudding, or slow-braised lamb — the difference is immediate." },
        { name: 'Black Peppercorns',       slug: 'black-peppercorns',       latin: 'Piper nigrum',         origin: 'Hill Country, Sri Lanka',      color: '#3C3A36', cat: 'whole-spices', certs: ['BESTSELLER'],            featured: true,  lkr: 1470, usd:  9.90, sku: 'BPC', desc: 'Classic Ceylon black peppercorns grown at Hill Country altitude. Bold, bright heat with subtle citrus notes — far more complex than the supermarket staple.' },
        { name: 'White Peppercorns',       slug: 'white-peppercorns',       latin: 'Piper nigrum',         origin: 'Hill Country, Sri Lanka',      color: '#B8B0A0', cat: 'whole-spices', certs: [],                        featured: false, lkr: 1840, usd: 12.40, sku: 'WPC', desc: 'Ripe pepper berries, water-processed to remove the outer hull. Milder heat, distinctly earthy — the traditional choice for white sauces and clear broths.' },
        { name: 'Mace Blades',             slug: 'mace-blades',             latin: 'Myristica fragrans',   origin: 'Sabaragamuwa, Sri Lanka',      color: '#C0531F', cat: 'whole-spices', certs: ['NEW'],                   featured: false, lkr: 3120, usd: 21.00, sku: 'MCB', desc: 'The lacy aril that wraps the nutmeg. Sabaragamuwa mace blades are floral, warm, and sweeter than the nut — a rare ingredient well worth seeking out.' },
        // ── Ground ────────────────────────────────────────────────────────────
        { name: 'Ceylon Cinnamon, Ground', slug: 'ceylon-cinnamon-ground',  latin: 'Cinnamomum verum',     origin: 'Matale Hills, Sri Lanka',      color: '#A85A1B', cat: 'ground',       certs: ['CEYLON_GI'],             featured: false, lkr: 1930, usd: 13.00, sku: 'CCG', desc: 'Stone-ground from Matale Hills Ceylon cinnamon. The same true cinnamon, milled fine for seamless blending in bakes, curries, and warming drinks.' },
        { name: 'Ground Turmeric',         slug: 'ground-turmeric',         latin: 'Curcuma longa',        origin: 'Southern Province, Sri Lanka', color: '#D99A1C', cat: 'ground',       certs: ['CEYLON_GI','BESTSELLER'], featured: false, lkr: 1260, usd:  8.50, sku: 'GTU', desc: "Deep-orange GI-certified turmeric from Sri Lanka's Southern Province. High curcumin content, earthy-warm flavour, and an aroma that transforms any dish." },
        { name: 'Ground Ginger',           slug: 'ground-ginger',           latin: 'Zingiber officinale',  origin: 'Gampaha District, Sri Lanka',  color: '#C99A4E', cat: 'ground',       certs: [],                        featured: false, lkr: 1520, usd: 10.25, sku: 'GGI', desc: 'Gampaha District ginger, dried and stone-milled. Punchy, warming, and fiercely aromatic — ideal for spiced bakes, marinades, and golden teas.' },
        // ── Blends ────────────────────────────────────────────────────────────
        { name: 'Ceylon Curry Powder',     slug: 'ceylon-curry-powder',     latin: 'Roasted estate blend', origin: 'Blended in Kandy, Sri Lanka',  color: '#9A5B22', cat: 'blends',       certs: ['BESTSELLER'],            featured: true,  lkr: 2040, usd: 13.75, sku: 'CCP', desc: 'A roasted estate blend crafted in Kandy. Earthy, warm, and pungent — balanced the traditional way, with proportions refined over three generations.' },
        { name: 'Kandyan Garam Masala',    slug: 'kandyan-garam-masala',    latin: 'Hand-ground blend',    origin: 'Blended in Kandy, Sri Lanka',  color: '#7A3E22', cat: 'blends',       certs: ['NEW'],                   featured: false, lkr: 2300, usd: 15.50, sku: 'KGM', desc: 'Hand-ground Kandyan-style garam masala. Sweeter and more floral than North Indian versions, built around Ceylon cinnamon, cardamom, and clove.' },
    ] as const;

    router.post('/seed-catalog', async (_req, res) => {
        // Dynamic import → always gets the fully-initialised prisma from index.ts
        // (avoids the circular-import timing issue with static imports)
        const { prisma } = await import('../index.js');
        const log: string[] = [];

        try {
            // 1. Categories
            const catDefs = [
                { name: 'Whole Spices', slug: 'whole-spices' },
                { name: 'Ground',       slug: 'ground'       },
                { name: 'Blends',       slug: 'blends'       },
            ];
            const catMap: Record<string, string> = {};
            for (const cat of catDefs) {
                let row = await prisma.category.findUnique({ where: { slug: cat.slug } });
                if (!row) row = await prisma.category.create({ data: cat });
                catMap[cat.slug] = row.id;
                log.push(`category: ${cat.name}`);
            }

            // 2. Products + variants
            let created = 0, skipped = 0;
            for (const p of CATALOG) {
                const exists = await prisma.product.findUnique({
                    where: { slug: p.slug },
                    select: { id: true },
                });
                if (exists) { skipped++; log.push(`skip: ${p.slug}`); continue; }

                const variants = WEIGHTS.flatMap((w) => [
                    {
                        weight: w,
                        price:  Math.round(p.lkr * MULT[w]),
                        sku:    `${p.sku}-${w}-LK`,
                        stock:  w === 50 ? 120 : w === 100 ? 90 : 40,
                        market: 'LOCAL' as const,
                        currency: 'LKR' as const,
                        packagingType: w === 250 ? 'foil_bag'     : 'kraft_pouch',
                        packagingDesc: w === 250 ? 'Large resealable foil bag — value pack'
                                                 : 'Kraft stand-up resealable pouch',
                    },
                    {
                        weight: w,
                        price:  Math.round(p.usd * MULT[w] * 100) / 100,
                        sku:    `${p.sku}-${w}-INT`,
                        stock:  w === 50 ? 120 : w === 100 ? 90 : 40,
                        market: 'INTERNATIONAL' as const,
                        currency: 'USD' as const,
                        packagingType: w === 250 ? 'gift_tin'           : 'glass_jar_premium',
                        packagingDesc: w === 250 ? 'Premium gift tin with ribbon and branded card'
                                                 : 'Premium glass jar with embossed lid and wax seal',
                    },
                ]);

                await prisma.product.create({
                    data: {
                        name: p.name, slug: p.slug, description: p.desc,
                        categoryId: catMap[p.cat]!,
                        certifications: [...p.certs],
                        status: 'ACTIVE', featured: p.featured, market: 'BOTH',
                        latin: p.latin, originLabel: p.origin, color: p.color,
                        variants: { create: variants },
                        images: {
                            create: [{
                                url: `https://res.cloudinary.com/aranya/image/upload/products/${p.slug}.jpg`,
                                altText: p.name,
                                position: 0,
                            }],
                        },
                    },
                });
                created++;
                log.push(`created: ${p.name} (6 variants)`);
            }

            res.json({ ok: true, created, skipped, total: CATALOG.length, log });

        } catch (e: any) {
            res.status(500).json({ ok: false, error: e.message, log });
        }
    });
}

export default router;
