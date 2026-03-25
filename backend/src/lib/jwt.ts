import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// TextEncoder converts string secret to Uint8Array — required by jose
const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export interface AccessTokenPayload extends JWTPayload {
    userId: string;
    email: string;
    role: string;
    twoFactorVerified?: boolean;
}

export interface RefreshTokenPayload extends JWTPayload {
    userId: string;
    family: string;   // Token family ID for reuse detection
    tokenId: string;  // DB Token.id — used to look up and invalidate
}

// --- Sign functions ---

export async function signAccessToken(payload: Omit<AccessTokenPayload, keyof JWTPayload>) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(process.env.JWT_ACCESS_EXPIRY ?? '15m')
        .sign(accessSecret);
}

export async function signRefreshToken(payload: Omit<RefreshTokenPayload, keyof JWTPayload>) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(process.env.JWT_REFRESH_EXPIRY ?? '7d')
        .sign(refreshSecret);
}

// --- Verify functions ---

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as RefreshTokenPayload;
}