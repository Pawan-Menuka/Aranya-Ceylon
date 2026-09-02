import { prisma } from '../index.js';
import type { Request } from 'express';
import { getClientIp } from '../lib/clientIp.js';

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
    // Authentication events occur before req.user is populated, so callers may
    // explicitly identify the actor after credentials have been verified.
    actorId?: string;
    event: AuditEvent;
    targetType: string;
    targetId: string;
    // Audit payloads may be full before/after snapshots or compact field-level
    // changes, depending on the sensitivity and size of the target record.
    diff?: Record<string, any>;
}) {
    const { req, actorId, event, targetType, targetId, diff } = params;

    await prisma.auditLog.create({
        data: {
            actorId: actorId ?? req.user?.userId ?? null,
            event,
            targetType,
            targetId,
            diff: diff ?? undefined,
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] ?? 'unknown',
        },
    });
}
