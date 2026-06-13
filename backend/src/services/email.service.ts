import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
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