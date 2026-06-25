import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env.js';

// TextEncoder converts string secret to Uint8Array — required by jose.
// env.JWT_ACCESS_SECRET is validated at boot (non-empty, >=32 chars in prod),
// so this can never silently become the bytes of the string "undefined".
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

// NOTE: refresh tokens are NOT JWTs. They are opaque random strings stored
// (hashed) in the Token table — see token.service.ts. Only access tokens
// are signed/verified here.

export interface AccessTokenPayload extends JWTPayload {
    userId: string;
    email: string;
    role: string;
    twoFactorVerified?: boolean;
}

// --- Sign functions ---

export async function signAccessToken(payload: Omit<AccessTokenPayload, keyof JWTPayload>) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(env.JWT_ACCESS_EXPIRY)
        .sign(accessSecret);
}

// --- Verify functions ---

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessTokenPayload;
}