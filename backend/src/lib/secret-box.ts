import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Authenticated encryption (AES-256-GCM) for secrets stored in the database,
// currently each admin's TOTP secret. A database dump alone must not let
// anyone generate their codes, so the key lives only in the environment:
//
//   TWO_FACTOR_ENCRYPTION_KEY = canonical base64 of 32 random bytes
//   (generate with: openssl rand -base64 32)
//
// The ciphertext is bound to its owner (AAD), so a value copied from one row
// to another will not decrypt.

const VERSION = 'v1';

export class SecretBoxUnavailableError extends Error {
    constructor() { super('TWO_FACTOR_ENCRYPTION_KEY is not configured'); }
}

function key(env: NodeJS.ProcessEnv = process.env): Buffer {
    const raw = env.TWO_FACTOR_ENCRYPTION_KEY;
    if (!raw) throw new SecretBoxUnavailableError();
    const bytes = Buffer.from(raw, 'base64');
    if (bytes.length !== 32 || bytes.toString('base64') !== raw) {
        throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be canonical base64 of exactly 32 bytes');
    }
    return bytes;
}

/** True when the key is present and well-formed. Never throws. */
export function secretBoxConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    try { key(env); return true; } catch { return false; }
}

export function seal(plaintext: string, owner: string, env: NodeJS.ProcessEnv = process.env): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key(env), iv);
    cipher.setAAD(Buffer.from(owner));
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function open(sealed: string, owner: string, env: NodeJS.ProcessEnv = process.env): string {
    const [version, iv, tag, data, extra] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || !data || extra !== undefined) throw new Error('Invalid sealed value');
    const decipher = createDecipheriv('aes-256-gcm', key(env), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(owner));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
