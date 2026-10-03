import type { Request, Response } from 'express';
import type { Coupon, Prisma } from '@prisma/client';
import { createCouponSchema, listCouponsQuerySchema, updateCouponSchema } from '@aranya/shared';
import { prisma } from '../../lib/prisma.js';
import { writeAuditLog } from '../../services/audit.service.js';

// Coupon management for the admin console (final audit #41). Customers apply a
// code through POST /cart/coupon; nothing here is publicly cached, so no
// storefront revalidation is needed.

type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED';

function couponStatus(coupon: Pick<Coupon, 'expiresAt' | 'usageLimit' | 'usageCount'>, now = new Date()): CouponStatus {
    if (coupon.expiresAt && coupon.expiresAt < now) return 'EXPIRED';
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) return 'EXHAUSTED';
    return 'ACTIVE';
}

// Decimal -> number so the console can render it without a Decimal library.
function present(coupon: Coupon) {
    return { ...coupon, discountValue: Number(coupon.discountValue), status: couponStatus(coupon) };
}

export async function listCoupons(req: Request, res: Response) {
    const { status, search, limit, cursor } = listCouponsQuerySchema.parse(req.query);
    const now = new Date();

    const where: Prisma.CouponWhereInput = {};
    if (search) where.code = { contains: search.toUpperCase() };
    // "active" / "expired" filter on the expiry only. An exhausted coupon is
    // still "active" here (the usage limit compares two columns, which a plain
    // filter cannot express); every row carries its derived status.
    if (status === 'expired') where.expiresAt = { lt: now };
    if (status === 'active') where.OR = [{ expiresAt: null }, { expiresAt: { gte: now } }];

    const rows = await prisma.coupon.findMany({
        where,
        orderBy: [{ code: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);

    res.json({
        coupons: page.map(present),
        nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
    });
}

export async function getCoupon(req: Request, res: Response) {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id! } });
    if (!coupon) { res.status(404).json({ error: 'Coupon not found' }); return; }
    res.json({ coupon: present(coupon) });
}

export async function createCoupon(req: Request, res: Response) {
    const data = createCouponSchema.parse(req.body);

    let coupon: Coupon;
    try {
        coupon = await prisma.coupon.create({
            data: {
                code: data.code,
                discountType: data.discountType,
                discountValue: data.discountValue,
                currency: data.currency ?? null,
                usageLimit: data.usageLimit ?? null,
                expiresAt: data.expiresAt ?? null,
            },
        });
    } catch (err) {
        if ((err as { code?: string }).code === 'P2002') {
            res.status(409).json({ error: 'A coupon with that code already exists' });
            return;
        }
        throw err;
    }

    await writeAuditLog({
        req, event: 'COUPON_CREATE', targetType: 'Coupon', targetId: coupon.id,
        diff: {
            code: coupon.code, discountType: coupon.discountType, discountValue: Number(coupon.discountValue),
            currency: coupon.currency, usageLimit: coupon.usageLimit, expiresAt: coupon.expiresAt,
        },
    });

    res.status(201).json({ coupon: present(coupon) });
}

// Only the usage limit and the expiry can change: editing the type, value or
// currency of a coupon that orders already used would reprice history.
export async function updateCoupon(req: Request, res: Response) {
    const id = req.params.id!;
    const patch = updateCouponSchema.parse(req.body);

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Coupon not found' }); return; }

    if (typeof patch.usageLimit === 'number' && patch.usageLimit < existing.usageCount) {
        res.status(409).json({ error: `Usage limit cannot be below the ${existing.usageCount} times it has already been used`, code: 'LIMIT_BELOW_USAGE' });
        return;
    }

    const coupon = await prisma.coupon.update({
        where: { id },
        data: {
            ...(patch.usageLimit !== undefined ? { usageLimit: patch.usageLimit } : {}),
            ...(patch.expiresAt !== undefined ? { expiresAt: patch.expiresAt } : {}),
        },
    });

    await writeAuditLog({
        req, event: 'COUPON_UPDATE', targetType: 'Coupon', targetId: id,
        diff: {
            before: { usageLimit: existing.usageLimit, expiresAt: existing.expiresAt },
            after: { usageLimit: coupon.usageLimit, expiresAt: coupon.expiresAt },
        },
    });

    res.json({ coupon: present(coupon) });
}

// "Deactivate" expires the coupon a moment ago: checkout already refuses an
// expired code, so no extra flag (or migration) is needed, and the history of
// who used it stays intact. Re-activate with PATCH { expiresAt: <future> | null }.
export async function deactivateCoupon(req: Request, res: Response) {
    const id = req.params.id!;
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Coupon not found' }); return; }

    const now = new Date();
    if (existing.expiresAt && existing.expiresAt < now) {
        // Already expired: nothing to do, and no audit noise for a repeat click.
        res.json({ coupon: present(existing) });
        return;
    }

    const coupon = await prisma.coupon.update({
        where: { id },
        data: { expiresAt: new Date(now.getTime() - 1000) },
    });

    await writeAuditLog({
        req, event: 'COUPON_DEACTIVATE', targetType: 'Coupon', targetId: id,
        diff: { before: { expiresAt: existing.expiresAt }, after: { expiresAt: coupon.expiresAt } },
    });

    res.json({ coupon: present(coupon) });
}
