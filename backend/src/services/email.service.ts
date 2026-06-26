import { Resend } from 'resend';

// Placeholder fallback so the module imports without a key (mirrors
// stripe.service). Real sends only happen with a real RESEND_API_KEY; callers
// (e.g. register's verification email) wrap sends in try/catch, so a missing key
// degrades to a logged error rather than crashing the process at import.
const resend = new Resend(process.env.RESEND_API_KEY ?? 're_stub_unused_key');
const FROM = process.env.EMAIL_FROM ?? 'orders@aranyaceylon.com';

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
                ${products.map((p) => `<tr><td>${p.name}</td><td>${p.sku}</td><td>${p.stock}</td></tr>`).join('')}
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
            ? `<h2>Application approved</h2><p>Congratulations ${companyName}! Your wholesale account is now active.</p>`
            : `<h2>Application update</h2><p>Thank you for applying, ${companyName}. Unfortunately we are unable to approve your application at this time.</p>`,
    });
}