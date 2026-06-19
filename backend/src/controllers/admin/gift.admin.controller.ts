import type { Request, Response } from 'express';
import { prisma } from '../../index.js';
import { writeAuditLog } from '../../services/audit.service.js';
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
    usd: z.string().min(1),
    lkr: z.string().min(1),
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

    const gift = await prisma.giftSet.create({ data: { ...data, badge: data.badge ?? null } });

    await writeAuditLog({
        req, event: 'GIFT_CREATE',
        targetType: 'GiftSet', targetId: gift.id,
    });

    res.status(201).json({ gift });
}

export async function updateGift(req: Request, res: Response) {
    const id = req.params.id!;
    const data = giftSchema.partial().parse(req.body);

    const existing = await prisma.giftSet.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Gift set not found' }); return; }

    const gift = await prisma.giftSet.update({
        where: { id },
        data: { ...data, ...(data.badge !== undefined && { badge: data.badge ?? null }) },
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

    res.json({ ok: true });
}

async function revalidateFrontend(path: string) {
    const secret = process.env.REVALIDATION_SECRET;
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    if (!secret) return;
    try {
        await fetch(`${baseUrl}/api/revalidate?secret=${secret}&path=${encodeURIComponent(path)}`);
    } catch { /* non-fatal */ }
}
