import { Resend } from 'resend';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { enqueueOutbox, outboxEnabled } from '../lib/outbox.js';
import { writeAuditLog } from './audit.service.js';
import { z } from 'zod';

// Placeholder fallback so the module imports without a key (mirrors
// stripe.service). Real sends only happen with a real RESEND_API_KEY; callers
// (e.g. register's verification email) wrap sends in try/catch, so a missing key
// degrades to a logged error rather than crashing the process at import.
const resend = new Resend(process.env.RESEND_API_KEY ?? 're_stub_unused_key');
const FROM = process.env.EMAIL_FROM ?? 'orders@aranyaceylon.com';

// Every send in this file goes through here so a bad RESEND_API_KEY (or any
// other send failure) in production leaves a trace someone will actually see
// (Phase 2 §2.11 — previously only `console.error`, which nobody was watching)
// instead of vanishing silently while customers pay and hear nothing. Logged
// as an AuditLog row (reuses the existing "Recent activity" admin dashboard
// feed rather than a new table/UI) and still rethrown so every caller's
// existing catch/console.error behavior is unchanged.
//
// IMPORTANT: the Resend SDK does NOT throw on API-level failures (bad key,
// unverified domain, rate limit, ...) — it resolves with `{ data: null, error:
// {...} }` and only ever rejects on a network-level exception (verified
// directly: an invalid key produced a 401 inside `result.error`, not a thrown
// error). Every send in this codebase, before this fix, was wrapped in
// try/catch expecting the failure to throw — so the single most likely real
// failure mode (a bad/expired API key) was silently swallowed as a "success"
// everywhere, not just uncaught. Checking `result.error` explicitly is the
// actual fix; the try/catch alone (kept for network-level failures) was not.
type SendParams = Parameters<typeof resend.emails.send>[0];
type MailContext = { tx: Prisma.TransactionClient; key: string; expiresAt?: Date; guard?: { cartId: string; updatedAt: string } };
const queuedMail = new AsyncLocalStorage<MailContext>();
// Render using the same templates, but persist the frozen provider payload in the caller's transaction.
export async function enqueueEmail(tx: Prisma.TransactionClient, key: string, render: () => Promise<unknown>, expiresAt?: Date,
    guard?: MailContext['guard']): Promise<void> {
    if (!outboxEnabled()) throw new Error('Outbox is disabled');
    await queuedMail.run({ tx, key, expiresAt, guard }, render);
}
export async function deliverQueuedEmail(payload: unknown, idempotencyKey: string): Promise<string> {
    const parsed = z.object({ mail: z.object({ from: z.string().min(1), to: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
        subject: z.string().min(1), html: z.string().min(1), replyTo: z.string().optional() }).strict() }).passthrough().safeParse(payload);
    if (!parsed.success) throw new Error('OUTBOX_INVALID_PAYLOAD');
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('EMAIL_NOT_CONFIGURED');
    const { replyTo, ...mail } = parsed.data.mail;
    // Worker transport is bounded and does not use SDK diagnostic logging, which can include provider text.
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ ...mail, ...(replyTo ? { reply_to: replyTo } : {}) }) });
    if (!response.ok) throw new Error('EMAIL_PROVIDER_REJECTED');
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string' || !result.id) throw new Error('EMAIL_PROVIDER_AMBIGUOUS');
    return result.id;
}
async function sendMail(payload: SendParams, type: string) {
    const context = queuedMail.getStore();
    if (context) {
        await enqueueOutbox(context.tx, { kind: 'EMAIL', dedupeKey: context.key, payload: { mail: payload, type, ...(context.guard ? { guard: context.guard } : {}) }, expiresAt: context.expiresAt });
        return;
    }
    if (outboxEnabled()) {
        await prisma.$transaction(tx => enqueueEmail(tx, `mail:${randomUUID()}`, () => sendMail(payload, type)));
        return;
    }
    const to = Array.isArray(payload.to) ? payload.to.join(', ') : String(payload.to);
    const logFailure = async (message: string) => {
        try {
            await writeAuditLog({
                event: 'EMAIL_SEND_FAILED',
                targetType: 'Email',
                targetId: to,
                diff: { type, error: message },
            });
        } catch (logErr) {
            console.error('[email] failed to record EMAIL_SEND_FAILED audit row:', logErr);
        }
    };

    let result: Awaited<ReturnType<typeof resend.emails.send>>;
    try {
        result = await resend.emails.send(payload);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await logFailure(message);
        throw err;
    }

    if (result.error) {
        const message = `${result.error.name}: ${result.error.message}`;
        await logFailure(message);
        throw new Error(message);
    }

    return result;
}

// Escape user-supplied text before interpolating into email HTML so a submitted
// name/message can't inject markup into the internal notification (also the fix
// pattern for SEC-09's unescaped interpolation).
function escapeHtml(s: string): string {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// --- Order confirmation ---
export async function sendOrderConfirmation(params: {
    to: string;
    orderId: string;
    total: number;
    currency: string;
    market: string;
}) {
    const { to, orderId, total, currency, market } = params;
    const currencySymbol = currency === 'LKR' ? 'LKR ' : '$';

    await sendMail({
        from: FROM,
        to,
        subject: `Your Aranya Ceylon order is confirmed — #${orderId.slice(-8).toUpperCase()}`,
        html: `
            <h2>Order confirmed</h2>
            <p>Thank you for your order. Your order ID is <strong>#${orderId.slice(-8).toUpperCase()}</strong>.</p>
            <p>Total: <strong>${currencySymbol}${total.toFixed(2)}</strong></p>
            <p>${market === 'LOCAL'
                ? 'Your order will be dispatched within 1–2 business days.'
                : 'Your order will be dispatched within 2–3 business days via DHL or FedEx.'
            }</p>
            <p>Track your order at <a href="${process.env.FRONTEND_URL}/account/orders">aranyaceylon.com</a></p>
        `,
    }, 'ORDER_CONFIRMATION');
}

// --- Abandoned cart recovery ---
// Sent by the hourly cron job (scheduler.ts) to a signed-in user whose cart
// has sat untouched for a few hours. Guest carts are never a target here —
// no email is captured before checkout, so there's nowhere to send this.
export async function sendAbandonedCartEmail(params: {
    to: string;
    items: { name: string; quantity: number }[];
}) {
    const { to, items } = params;
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0]!.trim();
    const cartUrl = `${frontend}/products?cart=1`;

    await sendMail({
        from: FROM,
        to,
        subject: 'You left something in your cart',
        html: `
            <h2>Still thinking it over?</h2>
            <p>Your cart is waiting with:</p>
            <ul>
                ${items.map((i) => `<li>${escapeHtml(i.name)} × ${i.quantity}</li>`).join('')}
            </ul>
            <p><a href="${cartUrl}">Finish your order</a></p>
        `,
    }, 'ABANDONED_CART');
}

// --- Email verification ---
// The public storefront BFF forwards GET /api/auth/verify to the API, which
// marks the account verified and redirects back. The API origin can remain
// private except for provider webhooks/health under the controlled VPS topology.
export async function sendVerificationEmail(params: { to: string; token: string }) {
    const { to, token } = params;
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0]!.trim().replace(/\/+$/, '');
    const verifyUrl = `${frontend}/api/auth/verify?token=${encodeURIComponent(token)}`;

    await sendMail({
        from: FROM,
        to,
        subject: 'Verify your Aranya Ceylon email',
        html: `
            <h2>Welcome to Aranya Ceylon</h2>
            <p>Please confirm your email address to activate your account.</p>
            <p><a href="${verifyUrl}">Verify my email</a></p>
            <p>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        `,
    }, 'EMAIL_VERIFICATION');
}

// --- Password reset ---
// Link points at the FRONTEND (not the API): unlike email verification this
// needs a form (choose a new password), not a one-click redirect.
export async function sendPasswordResetEmail(params: { to: string; token: string }) {
    const { to, token } = params;
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0]!.trim();
    const resetUrl = `${frontend}/account?resetToken=${encodeURIComponent(token)}`;

    await sendMail({
        from: FROM,
        to,
        subject: 'Reset your Aranya Ceylon password',
        html: `
            <h2>Reset your password</h2>
            <p>We received a request to reset your password. Click below to choose a new one.</p>
            <p><a href="${resetUrl}">Reset my password</a></p>
            <p>This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email — your password will not change.</p>
        `,
    }, 'PASSWORD_RESET');
}

// --- Admin new-order notification ---
// Sent once per order (first PENDING→PAID flip only, from confirmOrderPaid) so
// the merchant hears about every sale that actually needs fulfilling, not
// every abandoned checkout attempt (roadmap: admin notification on new orders).
export async function sendNewOrderAdminNotification(params: {
    orderId: string;
    total: number;
    currency: string;
    market: string;
    itemCount: number;
}) {
    const { orderId, total, currency, market, itemCount } = params;
    const currencySymbol = currency === 'LKR' ? 'LKR ' : '$';
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0]!.trim();

    await sendMail({
        from: FROM,
        to: process.env.ADMIN_EMAIL ?? FROM,
        subject: `New order #${orderId.slice(-8).toUpperCase()} — ${currencySymbol}${total.toFixed(2)}`,
        html: `
            <h2>New paid order</h2>
            <p>Order <strong>#${orderId.slice(-8).toUpperCase()}</strong> (${market}) just came through.</p>
            <p>Total: <strong>${currencySymbol}${total.toFixed(2)}</strong> — ${itemCount} item${itemCount === 1 ? '' : 's'}</p>
            <p><a href="${frontend}/admin/orders">View in admin</a></p>
        `,
    }, 'ADMIN_NEW_ORDER');
}

// --- Shipping notification ---
export async function sendShippingNotification(params: {
    to: string;
    orderId: string;
    trackingNumber: string;
    market: string;
}) {
    const { to, orderId, trackingNumber, market } = params;

    await sendMail({
        from: FROM,
        to,
        subject: `Your Aranya Ceylon order has shipped — #${orderId.slice(-8).toUpperCase()}`,
        html: `
            <h2>Your order is on its way</h2>
            <p>Tracking number: <strong>${trackingNumber}</strong></p>
            <p>${market === 'LOCAL'
                ? 'Estimated delivery: 2–5 business days.'
                : 'Estimated delivery: 5–10 business days via DHL/FedEx.'
            }</p>
        `,
    }, 'SHIPPING_NOTIFICATION');
}

// --- Low stock alert (internal — goes to admin email) ---
export async function sendLowStockAlert(products: { name: string; sku: string; stock: number }[]) {
    await sendMail({
        from: FROM,
        to: process.env.ADMIN_EMAIL ?? FROM,
        subject: `Low stock alert — ${products.length} variant(s) need restocking`,
        html: `
            <h2>Low stock alert</h2>
            <table border="1" cellpadding="6">
                <tr><th>Product</th><th>SKU</th><th>Stock</th></tr>
                ${products.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku)}</td><td>${p.stock}</td></tr>`).join('')}
            </table>
        `,
    }, 'LOW_STOCK_ALERT');
}

// --- Wholesale application notification ---
export async function sendWholesaleStatusEmail(params: {
    to: string;
    companyName: string;
    status: 'APPROVED' | 'REJECTED';
}) {
    const { to, companyName, status } = params;

    await sendMail({
        from: FROM,
        to,
        subject: `Your Aranya Ceylon wholesale application has been ${status.toLowerCase()}`,
        html: status === 'APPROVED'
            ? `<h2>Application approved</h2><p>Congratulations ${escapeHtml(companyName)}! Your wholesale account is now active.</p>`
            : `<h2>Application update</h2><p>Thank you for applying, ${escapeHtml(companyName)}. Unfortunately we are unable to approve your application at this time.</p>`,
    }, 'WHOLESALE_STATUS');
}

// --- Internal notification for contact / wholesale submissions ---
// Sends the submitted fields to the support inbox so enquiries aren't lost to a
// console.log (BUG-10). Best-effort: callers wrap in try/catch; with no
// RESEND_API_KEY it degrades to a logged error like every other send here.
export async function sendSupportNotification(params: {
    subject: string;
    replyTo?: string;
    fields: Array<[string, string]>;
}) {
    const rows = params.fields
        .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`)
        .join('');
    await sendMail({
        from: FROM,
        to: process.env.SUPPORT_EMAIL ?? process.env.ADMIN_EMAIL ?? FROM,
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        subject: params.subject,
        html: `<h2>${escapeHtml(params.subject)}</h2><table border="1" cellpadding="6">${rows}</table>`,
    }, 'SUPPORT_NOTIFICATION');
}
