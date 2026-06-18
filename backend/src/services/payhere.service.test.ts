/**
 * Unit tests for PayHere payload signing + webhook verification.
 * Pure crypto functions — no DB or network required.
 */
import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// vi.hoisted runs before the static import below, so payhere.service.ts
// reads these env values at module load.
vi.hoisted(() => {
    process.env.PAYHERE_MERCHANT_ID = 'TESTMERCHANT';
    process.env.PAYHERE_MERCHANT_SECRET = 'test-secret';
});

import { generatePayHereHash, buildPayHerePayload, verifyPayHereNotification } from './payhere.service.js';

// Independently compute what PayHere would send in md5sig
function payHereSideSig(orderId: string, amount: string, currency: string, statusCode: string) {
    const secretHash = crypto.createHash('md5').update('test-secret').digest('hex').toUpperCase();
    return crypto.createHash('md5')
        .update(`TESTMERCHANT${orderId}${amount}${currency}${statusCode}${secretHash}`)
        .digest('hex')
        .toUpperCase();
}

describe('generatePayHereHash', () => {
    it('produces the documented MD5(merchant+order+amount+currency+MD5(secret)) format', () => {
        const hash = generatePayHereHash('order_1', '650.00', 'LKR');
        const secretHash = crypto.createHash('md5').update('test-secret').digest('hex').toUpperCase();
        const expected = crypto.createHash('md5')
            .update(`TESTMERCHANTorder_1650.00LKR${secretHash}`)
            .digest('hex')
            .toUpperCase();
        expect(hash).toBe(expected);
    });
});

describe('buildPayHerePayload', () => {
    it('formats the amount to exactly 2 decimals and signs it', () => {
        const payload = buildPayHerePayload({
            orderId: 'order_42', amount: 1234.5,
            firstName: 'Test', lastName: 'User', email: 't@e.com',
            phone: '0771234567', address: '1 Main St', city: 'Colombo',
        });
        expect(payload.amount).toBe('1234.50');
        expect(payload.currency).toBe('LKR');
        expect(payload.hash).toBe(generatePayHereHash('order_42', '1234.50', 'LKR'));
        expect(payload.order_id).toBe('order_42');
    });
});

describe('verifyPayHereNotification', () => {
    const base = {
        merchantId: 'TESTMERCHANT',
        orderId: 'order_7',
        payhereAmount: '2150.00',
        payhereCurrency: 'LKR',
        statusCode: '2',
    };

    it('accepts a correctly signed notification', () => {
        const md5sig = payHereSideSig(base.orderId, base.payhereAmount, base.payhereCurrency, base.statusCode);
        expect(verifyPayHereNotification({ ...base, md5sig })).toBe(true);
    });

    it('rejects a tampered amount', () => {
        const md5sig = payHereSideSig(base.orderId, base.payhereAmount, base.payhereCurrency, base.statusCode);
        expect(verifyPayHereNotification({ ...base, payhereAmount: '1.00', md5sig })).toBe(false);
    });

    it('rejects a tampered status code (failed → success forgery)', () => {
        const md5sig = payHereSideSig(base.orderId, base.payhereAmount, base.payhereCurrency, '-2');
        expect(verifyPayHereNotification({ ...base, statusCode: '2', md5sig })).toBe(false);
    });

    it('rejects a garbage signature', () => {
        expect(verifyPayHereNotification({ ...base, md5sig: 'DEADBEEF' })).toBe(false);
    });
});
