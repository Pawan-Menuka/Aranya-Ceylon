import { prisma } from '../index.js';
import type { Request } from 'express';

type AuditEvent =
    | 'ORDER_STATUS_UPDATE'
    | 'ORDER_REFUND'
    | 'PRODUCT_CREATE'
    | 'PRODUCT_UPDATE'
    | 'PRODUCT_ARCHIVE'
    | 'USER_ROLE_CHANGE'
    | 'USER_SUSPEND'
    | 'BLOG_CREATE'
    | 'BLOG_PUBLISH'
    | 'BLOG_UPDATE'
    | 'BLOG_DELETE'
    | 'RECIPE_CREATE'
    | 'RECIPE_UPDATE'
    | 'RECIPE_DELETE'
    | 'GIFT_CREATE'
    | 'GIFT_UPDATE'
    | 'GIFT_DELETE'
    | 'COUPON_CREATE'
    | 'COUPON_DEACTIVATE'
    | 'WHOLESALE_APPROVE'
    | 'WHOLESALE_REJECT'
    | 'ADMIN_LOGIN';

// Creates an immutable audit record.
// The DB-level REVOKE DELETE ensures these records can never be
// deleted even if this function or the API is compromised.
export async function writeAuditLog(params: {
    req: Request;
    event: AuditEvent;
    targetType: string;
    targetId: string;
    diff?: { before: any; after: any };
}) {
    const { req, event, targetType, targetId, diff } = params;

    await prisma.auditLog.create({
        data: {
            actorId: req.user?.userId ?? null,
            event,
            targetType,
            targetId,
            diff: diff ?? undefined,
            ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
                ?? req.socket.remoteAddress
                ?? 'unknown',
            userAgent: req.headers['user-agent'] ?? 'unknown',
        },
    });
}