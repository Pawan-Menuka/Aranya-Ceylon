import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s step), the
// profile every authenticator app (Google Authenticator, Authy, 1Password…)
// understands. Implemented on node:crypto so a security-critical path adds no
// dependency.

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Buffer): string {
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
    return out;
}

export function base32Decode(text: string): Buffer {
    const clean = text.replace(/[\s=-]/g, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const char of clean) {
        const index = BASE32.indexOf(char);
        if (index === -1) throw new Error('Invalid base32 secret');
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

/** A fresh 160-bit secret, base32-encoded (what an authenticator app is given). */
export function generateTotpSecret(): string {
    return base32Encode(randomBytes(20));
}

export const totpStep = (nowMs: number): number => Math.floor(nowMs / 1000 / STEP_SECONDS);

export function totpAtStep(secretBase32: string, step: number): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hmac = createHmac('sha1', base32Decode(secretBase32)).update(counter).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary = ((hmac[offset]! & 0x7f) << 24) | (hmac[offset + 1]! << 16) | (hmac[offset + 2]! << 8) | hmac[offset + 3]!;
    return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * Checks `code` against the current step and `window` steps either side (clock
 * drift). Returns the matching step, or null. A step at or below `lastStep` is
 * never accepted, so a code cannot be replayed within its validity window.
 */
export function verifyTotp(
    secretBase32: string,
    code: string,
    options: { nowMs?: number; window?: number; lastStep?: number | null } = {},
): number | null {
    if (!/^\d{6}$/.test(code)) return null;
    const { nowMs = Date.now(), window = 1, lastStep = null } = options;
    const current = totpStep(nowMs);
    const supplied = Buffer.from(code);

    let matched: number | null = null;
    // Always test every step in the window (no early exit) so timing does not
    // reveal which step, if any, was close.
    for (let offset = -window; offset <= window; offset++) {
        const step = current + offset;
        const expected = Buffer.from(totpAtStep(secretBase32, step));
        if (timingSafeEqual(expected, supplied) && (lastStep === null || step > lastStep) && matched === null) {
            matched = step;
        }
    }
    return matched;
}

/** otpauth:// URI an authenticator app reads from a QR code. */
export function otpauthUri(secretBase32: string, account: string, issuer = 'Aranya Ceylon'): string {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
    const query = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
    return `otpauth://totp/${label}?${query.toString()}`;
}
