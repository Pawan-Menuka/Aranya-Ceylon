import { Resend } from 'resend';

// Placeholder fallback so the module imports without a key (mirrors
// stripe.service). Real sends only happen with a real RESEND_API_KEY; callers
// (e.g. register's verification email) wrap sends in try/catch, so a missing key
// degrades to a logged error rather than crashing the process at import.
const resend = new Resend(process.env.RESEND_API_KEY ?? 're_stub_unused_key');
const FROM = process.env.EMAIL_FROM ?? 'orders@aranyaceylon.com';

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

    await resend.emails.send({
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
    });
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

    await resend.emails.send({
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
    });
}

// --- Email verification ---
// Link points at the API's GET /auth/verify, which marks the account verified
// and then redirects the browser back to the storefront.
export async function sendVerificationEmail(params: { to: string; token: string }) {
    const { to, token } = params;
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const verifyUrl = `${apiUrl}/auth/verify?token=${encodeURIComponent(token)}`;

    await resend.emails.send({
        from: FROM,
        to,
        subject: 'Verify your Aranya Ceylon email',
        html: `
            <h2>Welcome to Aranya Ceylon</h2>
            <p>Please confirm your email address to activate your account.</p>
            <p><a href="${verifyUrl}">Verify my email</a></p>
            <p>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        `,
    });
}

// --- Password reset ---
// Link points at the FRONTEND (not the API): unlike email verification this
// needs a form (choose a new password), not a one-click redirect.
export async function sendPasswordResetEmail(params: { to: string; token: string }) {
    const { to, token } = params;
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0]!.trim();
    const resetUrl = `${frontend}/account?resetToken=${encodeURIComponent(token)}`;

    await resend.emails.send({
        from: FROM,
        to,
        subject: 'Reset your Aranya Ceylon password',
        html: `
            <h2>Reset your password</h2>
            <p>We received a request to reset your password. Click below to choose a new one.</p>
            <p><a href="${resetUrl}">Reset my password</a></p>
            <p>This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email — your password will not change.</p>
        `,
    });
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

    await resend.emails.send({
        from: FROM,
        to: process.env.ADMIN_EMAIL ?? FROM,
        subject: `New order #${orderId.slice(-8).toUpperCase()} — ${currencySymbol}${total.toFixed(2)}`,
        html: `
            <h2>New paid order</h2>
            <p>Order <strong>#${orderId.slice(-8).toUpperCase()}</strong> (${market}) just came through.</p>
            <p>Total: <strong>${currencySymbol}${total.toFixed(2)}</strong> — ${itemCount} item${itemCount === 1 ? '' : 's'}</p>
            <p><a href="${frontend}/admin/orders">View in admin</a></p>
        `,
    });
}

// --- Shipping notification ---
export async function sendShippingNotification(params: {
    to: string;
    orderId: string;
    trackingNumber: string;
    market: string;
}) {
    const { to, orderId, trackingNumber, market } = params;

    await resend.emails.send({
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
    });
}

// --- Low stock alert (internal — goes to admin email) ---
export async function sendLowStockAlert(products: { name: string; sku: string; stock: number }[]) {
    await resend.emails.send({
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
    });
}

// --- Wholesale application notification ---
export async function sendWholesaleStatusEmail(params: {
    to: string;
    companyName: string;
    status: 'APPROVED' | 'REJECTED';
}) {
    const { to, companyName, status } = params;

    await resend.emails.send({
        from: FROM,
        to,
        subject: `Your Aranya Ceylon wholesale application has been ${status.toLowerCase()}`,
        html: status === 'APPROVED'
            ? `<h2>Application approved</h2><p>Congratulations ${escapeHtml(companyName)}! Your wholesale account is now active.</p>`
            : `<h2>Application update</h2><p>Thank you for applying, ${escapeHtml(companyName)}. Unfortunately we are unable to approve your application at this time.</p>`,
    });
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
    await resend.emails.send({
        from: FROM,
        to: process.env.SUPPORT_EMAIL ?? process.env.ADMIN_EMAIL ?? FROM,
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        subject: params.subject,
        html: `<h2>${escapeHtml(params.subject)}</h2><table border="1" cellpadding="6">${rows}</table>`,
    });
}