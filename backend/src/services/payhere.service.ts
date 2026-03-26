import crypto from 'crypto';

const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID!;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET!;
const MODE = process.env.PAYHERE_MODE ?? 'sandbox';

// PayHere endpoints
export const PAYHERE_CHECKOUT_URL = MODE === 'live'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';

// --- Generate the MD5 hash PayHere requires ---
// Hash = MD5( merchant_id + order_id + amount + currency + MD5(merchant_secret) )
// This proves to PayHere that the payment request came from your server
// and that the amount has not been tampered with.
export function generatePayHereHash(
    orderId: string,
    amountFormatted: string, // Must be exactly 2 decimal places e.g. "650.00"
    currency: string = 'LKR',
): string {
    // First: hash your merchant secret
    const merchantSecretHash = crypto
        .createHash('md5')
        .update(MERCHANT_SECRET)
        .digest('hex')
        .toUpperCase();

    // Then: hash the full string
    const hashString = `${MERCHANT_ID}${orderId}${amountFormatted}${currency}${merchantSecretHash}`;
    return crypto
        .createHash('md5')
        .update(hashString)
        .digest('hex')
        .toUpperCase();
}

// --- Build the payload the frontend POSTs to PayHere ---
// The frontend renders a hidden form and submits it to PAYHERE_CHECKOUT_URL.
// PayHere validates the hash, shows its hosted payment page,
// then redirects back to return_url and fires notify_url webhook.
export function buildPayHerePayload(params: {
    orderId: string;
    amount: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
}) {
    const amountFormatted = params.amount.toFixed(2); // e.g. "650.00"
    const currency = 'LKR';
    const hash = generatePayHereHash(params.orderId, amountFormatted, currency);

    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    return {
        merchant_id: MERCHANT_ID,
        return_url: `${baseUrl}/checkout/success?orderId=${params.orderId}`,
        cancel_url: `${baseUrl}/checkout/cancel?orderId=${params.orderId}`,
        notify_url: `${process.env.API_URL ?? 'http://localhost:4000'}/webhooks/payhere`,
        order_id: params.orderId,
        items: 'Aranya Ceylon Order',
        currency,
        amount: amountFormatted,
        hash,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        address: params.address,
        city: params.city,
        country: 'Sri Lanka',
    };
}

// --- Verify PayHere webhook notification ---
// Called inside the webhook handler to confirm the notify came from PayHere.
// Hash = MD5( merchant_id + order_id + amount + currency + status_code + MD5(secret) )
export function verifyPayHereNotification(params: {
    merchantId: string;
    orderId: string;
    payhereAmount: string;
    payhereCurrency: string;
    statusCode: string;
    md5sig: string;
}): boolean {
    const merchantSecretHash = crypto
        .createHash('md5')
        .update(MERCHANT_SECRET)
        .digest('hex')
        .toUpperCase();

    const expectedHash = crypto
        .createHash('md5')
        .update(
            `${params.merchantId}${params.orderId}${params.payhereAmount}${params.payhereCurrency}${params.statusCode}${merchantSecretHash}`,
        )
        .digest('hex')
        .toUpperCase();

    return params.md5sig === expectedHash;
}