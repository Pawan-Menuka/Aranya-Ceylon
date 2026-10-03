import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totpAtStep, totpStep, verifyTotp } from './totp.js';
import { open, seal, secretBoxConfigured, SecretBoxUnavailableError } from './secret-box.js';

// RFC 6238 appendix B, SHA-1, shared secret "12345678901234567890". The RFC lists
// 8-digit codes; the 6-digit code is their last six digits.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_VECTORS: Array<[number, string]> = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
];

describe('TOTP (RFC 6238)', () => {
    it.each(RFC_VECTORS)('produces the published code at T=%i', (seconds, expected) => {
        expect(totpAtStep(RFC_SECRET, totpStep(seconds * 1000))).toBe(expected);
    });

    it('round-trips base32 and rejects characters outside the alphabet', () => {
        const bytes = randomBytes(20);
        expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
        expect(base32Decode('gezd gnbv-GY3TQOJQ')).toEqual(base32Decode('GEZDGNBVGY3TQOJQ'));
        expect(() => base32Decode('GEZD1')).toThrow();
        expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
    });

    it('accepts the current step and one step of clock drift, but not two', () => {
        const now = 1_700_000_000_000;
        const step = totpStep(now);
        expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step), { nowMs: now })).toBe(step);
        expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step - 1), { nowMs: now })).toBe(step - 1);
        expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step + 1), { nowMs: now })).toBe(step + 1);
        expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step - 2), { nowMs: now })).toBeNull();
        expect(verifyTotp(RFC_SECRET, totpAtStep(RFC_SECRET, step + 2), { nowMs: now })).toBeNull();
    });

    it('never accepts a step at or below the last one used (replay protection)', () => {
        const now = 1_700_000_000_000;
        const step = totpStep(now);
        const code = totpAtStep(RFC_SECRET, step);
        expect(verifyTotp(RFC_SECRET, code, { nowMs: now, lastStep: step - 1 })).toBe(step);
        expect(verifyTotp(RFC_SECRET, code, { nowMs: now, lastStep: step })).toBeNull();
        expect(verifyTotp(RFC_SECRET, code, { nowMs: now, lastStep: step + 5 })).toBeNull();
    });

    it('rejects malformed codes without throwing', () => {
        for (const bad of ['', '12345', '1234567', 'abcdef', '12 345', '١٢٣٤٥٦']) {
            expect(verifyTotp(RFC_SECRET, bad)).toBeNull();
        }
    });

    it('builds an otpauth URI an authenticator can import', () => {
        const uri = otpauthUri('ABCDEFGH', 'admin@example.com');
        expect(uri.startsWith('otpauth://totp/Aranya%20Ceylon:admin%40example.com?')).toBe(true);
        const params = new URL(uri).searchParams;
        expect(params.get('secret')).toBe('ABCDEFGH');
        expect(params.get('issuer')).toBe('Aranya Ceylon');
        expect(params.get('digits')).toBe('6');
        expect(params.get('period')).toBe('30');
    });
});

describe('secret box', () => {
    const env = { TWO_FACTOR_ENCRYPTION_KEY: randomBytes(32).toString('base64') } as NodeJS.ProcessEnv;

    it('round-trips a secret, never stores it in the clear, and uses a fresh IV each time', () => {
        const a = seal('JBSWY3DPEHPK3PXP', 'user_1', env);
        expect(a).not.toContain('JBSWY3DPEHPK3PXP');
        expect(open(a, 'user_1', env)).toBe('JBSWY3DPEHPK3PXP');
        expect(seal('JBSWY3DPEHPK3PXP', 'user_1', env)).not.toBe(a);
    });

    it('will not decrypt for another owner, after tampering, or with another key', () => {
        const sealed = seal('SECRET', 'user_1', env);
        expect(() => open(sealed, 'user_2', env)).toThrow();
        const [v, iv, tag, data] = sealed.split('.');
        const flipped = `${v}.${iv}.${tag}.${Buffer.from(Buffer.from(data!, 'base64url').map((b, i) => (i === 0 ? b ^ 1 : b))).toString('base64url')}`;
        expect(() => open(flipped, 'user_1', env)).toThrow();
        expect(() => open(sealed, 'user_1', { TWO_FACTOR_ENCRYPTION_KEY: randomBytes(32).toString('base64') } as NodeJS.ProcessEnv)).toThrow();
    });

    it('reports a missing key as unavailable and refuses a malformed one', () => {
        expect(secretBoxConfigured(env)).toBe(true);
        expect(secretBoxConfigured({} as NodeJS.ProcessEnv)).toBe(false);
        expect(() => seal('x', 'u', {} as NodeJS.ProcessEnv)).toThrow(SecretBoxUnavailableError);
        expect(secretBoxConfigured({ TWO_FACTOR_ENCRYPTION_KEY: 'too-short' } as NodeJS.ProcessEnv)).toBe(false);
        expect(secretBoxConfigured({ TWO_FACTOR_ENCRYPTION_KEY: randomBytes(16).toString('base64') } as NodeJS.ProcessEnv)).toBe(false);
    });
});
