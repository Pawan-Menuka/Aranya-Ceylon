import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { revalidateFrontend } from '../../lib/revalidate.js';
import { z } from 'zod';

type Tx = Prisma.TransactionClient;

const giftSchema = z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(2),
    featured: z.boolean().default(false),
    tagline: z.string().min(2),
    blurb: z.string().min(2),
    badge: z.string().nullable().optional(),
    jar: z.string().default('50g'),
    color: z.string().default('#B5651D'),
    base: z.string().default('#C2772E'),
    deep: z.string().default('#7E481A'),
    surface: z.string().default('#F3E7D4'),
    // Prices stored as Decimal; coerce so a numeric string from the form is
    // accepted and validated as a positive number.
    usd: z.coerce.number().positive(),
    lkr: z.coerce.number().positive(),
    contents: z.array(z.string()).min(1),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

// ----------------------------------------------------------------
// Backing product/variant sync (remaining-surfaces audit #2, #3).
//
// A gift set is only actually purchasable when it's backed by a real,
// catalog-hidden (DRAFT) Product with one Variant per market — that's what
// lets it flow through the normal cart -> checkout -> stock pipeline
// (gift.controller.ts's attachBackingProducts resolves it by slug
// convention: `gift-<giftSlug>`). Previously createGift never created this
// backing product at all (a published gift set silently wasn't purchasable),
// and updateGift never kept GiftSet.usd/lkr (display price) in sync with the
// backing Variant.price (what checkout actually charges) — an admin price
// edit changed what customers SAW without changing what they'd be CHARGED.
// Mirrors prisma/seed-gifts.ts's exact conventions (slug, SKU, stock).
// ----------------------------------------------------------------
const GIFT_BACKING_STOCK = 999;
const backingSlug = (giftSlug: string) => `gift-${giftSlug}`;

async function ensureBackingProduct(
    tx: Tx,
    gift: { slug: string; name: string; blurb: string; featured: boolean; color: string; jar: string; contents: string[]; usd: Prisma.Decimal | number; lkr: Prisma.Decimal | number },
) {
    const category = await tx.category.upsert({
        where: { slug: 'gift-sets' },
        update: {},
        create: { name: 'Gift Sets', slug: 'gift-sets' },
    });
    const jarGrams = parseInt(gift.jar, 10) || 50;
    const totalGrams = gift.contents.length * jarGrams;
    const slug = backingSlug(gift.slug);

    return tx.product.create({
        data: {
            name: gift.name,
            slug,
            description: gift.blurb,
            categoryId: category.id,
            status: 'DRAFT', // catalog-hidden — reached only via /gifts, never the regular catalog
            market: 'BOTH',
            featured: gift.featured,
            color: gift.color,
            originLabel: 'Gift Set',
            variants: {
                create: [
                    { sku: `GIFT-${gift.slug}-LKR`, weight: totalGrams, price: Number(gift.lkr), market: 'LOCAL', currency: 'LKR', stock: GIFT_BACKING_STOCK },
                    { sku: `GIFT-${gift.slug}-USD`, weight: totalGrams, price: Number(gift.usd), market: 'INTERNATIONAL', currency: 'USD', stock: GIFT_BACKING_STOCK },
                ],
            },
        },
        include: { variants: true },
    });
}

// Keeps an EXISTING backing product's slug/price/weight in sync after an
// edit. Looks up by the PRE-update slug (a slug rename would otherwise orphan
// the backing product under its old `gift-<slug>`, silently un-backing the
// gift set). No-op (not an error) if no backing product exists yet — lets an
// already-live gift set (created before this fix, or seeded) still update.
async function syncBackingProduct(
    tx: Tx,
    oldSlug: string,
    gift: { slug: string; jar: string; contents: string[]; usd: Prisma.Decimal | number; lkr: Prisma.Decimal | number },
) {
    const product = await tx.product.findUnique({ where: { slug: backingSlug(oldSlug) }, include: { variants: true } });
    if (!product) return;

    const newSlug = backingSlug(gift.slug);
    if (newSlug !== product.slug) {
        await tx.product.update({ where: { id: product.id }, data: { slug: newSlug } });
    }

    const jarGrams = parseInt(gift.jar, 10) || 50;
    const totalGrams = gift.contents.length * jarGrams;
    for (const v of product.variants) {
        const price = v.currency === 'LKR' ? gift.lkr : v.currency === 'USD' ? gift.usd : undefined;
        await tx.variant.update({
            where: { id: v.id },
            data: { weight: totalGrams, ...(price !== undefined && { price: Number(price) }) },
        });
    }
}

export async function listGifts(_req: Request, res: Response) {
    const gifts = await prisma.giftSet.findMany({
        orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
        take: 500, // bound an otherwise unlimited load (PERF-07)
        select: {
            id: true, slug: true, name: true, featured: true,
            badge: true, usd: true, lkr: true, status: true,
            contents: true, jar: true, createdAt: true,
        },
    });
    res.json({ gifts });
}

export async function getGift(req: Request, res: Response) {
    const gift = await prisma.giftSet.findUnique({ where: { id: req.params.id! } });
    if (!gift) { res.status(404).json({ error: 'Gift set not found' }); return; }
    res.json({ gift });
}

export async function createGift(req: Request, res: Response) {
    const data = giftSchema.parse(req.body);

    let gift;
    try {
        gift = await prisma.$transaction(async (tx) => {
            const created = await tx.giftSet.create({ data: { ...data, badge: data.badge ?? null } });
            await ensureBackingProduct(tx, created);
            return created;
        });
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            res.status(409).json({ error: 'A gift set with that slug already exists' }); return;
        }
        throw err;
    }

    await writeAuditLog({
        req, event: 'GIFT_CREATE',
        targetType: 'GiftSet', targetId: gift.id,
    });

    // P3-4: revalidate when a gift set is published immediately on create
    if (data.status === 'PUBLISHED') {
        await revalidateFrontend('/gifts');
    }

    res.status(201).json({ gift });
}

export async function updateGift(req: Request, res: Response) {
    const id = req.params.id!;
    const data = giftSchema.partial().parse(req.body);

    const existing = await prisma.giftSet.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Gift set not found' }); return; }

    let gift;
    try {
        gift = await prisma.$transaction(async (tx) => {
            const updated = await tx.giftSet.update({
                where: { id },
                data: { ...data, ...(data.badge !== undefined && { badge: data.badge ?? null }) },
            });
            // Keep the backing Variant's price/weight in sync with the edit —
            // uses the full post-update row so this is correct even when the
            // request only touched some fields (e.g. contents changed but
            // usd/lkr didn't, or vice versa).
            await syncBackingProduct(tx, existing.slug, updated);
            return updated;
        });
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            res.status(409).json({ error: 'A gift set with that slug already exists' }); return;
        }
        throw err;
    }

    // P3-3: audit log for updates (was missing)
    await writeAuditLog({
        req, event: 'GIFT_UPDATE',
        targetType: 'GiftSet', targetId: id,
        diff: { before: existing, after: gift },
    });

    await revalidateFrontend('/gifts');

    res.json({ gift });
}

export async function deleteGift(req: Request, res: Response) {
    const id = req.params.id!;

    const existing = await prisma.giftSet.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Gift set not found' }); return; }

    await prisma.giftSet.delete({ where: { id } });

    await writeAuditLog({
        req, event: 'GIFT_DELETE',
        targetType: 'GiftSet', targetId: id,
    });

    // P3-4: revalidate on delete
    await revalidateFrontend('/gifts');

    res.json({ ok: true });
}
