import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { open, seal } from '../lib/secret-box.js';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../lib/totp.js';

// TOTP two-factor sign-in for ADMIN and SUPERADMIN accounts (final audit #43).
//
// Enrolment is two steps so a typo in the authenticator never locks anyone out:
//   1. beginEnrolment  -> a secret is stored (encrypted, not yet active) and
//                         shown once for the authenticator;
//   2. confirmEnrolment -> the user proves the app produces valid codes; only
//                         then is two-factor switched on and recovery codes issued.

export const RECOVERY_CODE_COUNT = 10;

export type TwoFactorFailure = 'ALREADY_ENABLED' | 'NO_PENDING_ENROLMENT' | 'INVALID_CODE';
export class TwoFactorError extends Error {
    constructor(public code: TwoFactorFailure) { super(code); }
}

// 32 unambiguous characters (no 0/O/1/I): 256 is a multiple of 32, so mapping a
// random byte with `% 32` is unbiased. 16 characters = 80 bits of entropy,
// enough that a bare SHA-256 of the code is safe to store.
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRecoveryCode(): string {
    const chars = Array.from(randomBytes(16), (byte) => RECOVERY_ALPHABET[byte % 32]!);
    return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

/** Hash of a recovery code as typed: case, dashes and spaces are ignored. */
export function hashRecoveryCode(code: string): string {
    return createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
}

export async function beginEnrolment(user: { id: string; email: string; twoFactorEnabled: boolean }) {
    if (user.twoFactorEnabled) throw new TwoFactorError('ALREADY_ENABLED');
    const secret = generateTotpSecret();
    // Starting again replaces any earlier unconfirmed secret.
    await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: seal(secret, user.id), twoFactorLastStep: null },
    });
    return { secret, otpauthUri: otpauthUri(secret, user.email) };
}

/** Returns the plaintext recovery codes. They are never retrievable again. */
export async function confirmEnrolment(userId: string, code: string): Promise<string[]> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true, twoFactorSecret: true } });
    if (!user || user.twoFactorEnabled || !user.twoFactorSecret) throw new TwoFactorError('NO_PENDING_ENROLMENT');

    const step = verifyTotp(open(user.twoFactorSecret, userId), code);
    if (step === null) throw new TwoFactorError('INVALID_CODE');

    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    // Conditional on "not yet enabled" so two simultaneous confirmations cannot both win.
    const { count } = await prisma.user.updateMany({
        where: { id: userId, twoFactorEnabled: false },
        data: { twoFactorEnabled: true, twoFactorRecoveryCodes: codes.map(hashRecoveryCode), twoFactorLastStep: step },
    });
    if (count === 0) throw new TwoFactorError('ALREADY_ENABLED');
    return codes;
}

export interface SecondFactorUser {
    id: string;
    twoFactorSecret: string | null;
    twoFactorLastStep: number | null;
    twoFactorRecoveryCodes: string[];
}

/** Checks an authenticator code or a one-time recovery code. Each can succeed only once. */
export async function verifySecondFactor(
    user: SecondFactorUser,
    input: { totpCode?: string; recoveryCode?: string },
): Promise<boolean> {
    if (input.totpCode) {
        if (!user.twoFactorSecret) return false;
        const step = verifyTotp(open(user.twoFactorSecret, user.id), input.totpCode, { lastStep: user.twoFactorLastStep });
        if (step === null) return false;
        // Claim the step atomically: of two simultaneous uses of the same code, only one updates a row.
        const { count } = await prisma.user.updateMany({
            where: { id: user.id, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
            data: { twoFactorLastStep: step },
        });
        return count === 1;
    }

    if (input.recoveryCode) {
        const hash = hashRecoveryCode(input.recoveryCode);
        if (!user.twoFactorRecoveryCodes.includes(hash)) return false;
        // Remove it in one statement that only matches while it is still present,
        // so a code can never be spent twice, even concurrently.
        const removed = await prisma.$executeRaw`
            UPDATE "User"
            SET "twoFactorRecoveryCodes" = array_remove("twoFactorRecoveryCodes", ${hash})
            WHERE "id" = ${user.id} AND ${hash} = ANY("twoFactorRecoveryCodes")`;
        return removed === 1;
    }

    return false;
}

/** Turns two-factor off and erases the secret and recovery codes (self-service and SUPERADMIN reset). */
export async function disableTwoFactor(userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [], twoFactorLastStep: null },
    });
}
