import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
import { revalidateFrontend } from '../../lib/revalidate.js';
import { z } from 'zod';

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

export async function listGifts(_req: Request, res: Response) {
    const gifts = await prisma.giftSet.findMany({
        orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
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
        gift = await prisma.giftSet.create({ data: { ...data, badge: data.badge ?? null } });
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
        gift = await prisma.giftSet.update({
            where: { id },
            data: { ...data, ...(data.badge !== undefined && { badge: data.badge ?? null }) },
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
