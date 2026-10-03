import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { totpAtStep, totpStep } from '../lib/totp.js';

interface Row {
    id: string; email: string; twoFactorEnabled: boolean; twoFactorSecret: string | null;
    twoFactorRecoveryCodes: string[]; twoFactorLastStep: number | null;
}

const db = vi.hoisted(() => ({ row: undefined as unknown as Row }));

vi.mock('../lib/prisma.js', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(async () => ({ ...db.row })),
            update: vi.fn(async ({ data }: { data: Partial<Row> }) => { Object.assign(db.row, data); return { ...db.row }; }),
            // Honours the where clauses the service relies on for atomicity.
            updateMany: vi.fn(async ({ where, data }: { where: { twoFactorEnabled?: boolean; OR?: Array<{ twoFactorLastStep: null | { lt: number } }> }; data: Partial<Row> }) => {
                if (where.twoFactorEnabled !== undefined && db.row.twoFactorEnabled !== where.twoFactorEnabled) return { count: 0 };
                if (where.OR) {
                    const last = db.row.twoFactorLastStep;
                    const ok = where.OR.some((c) => (c.twoFactorLastStep === null ? last === null : last !== null && last < c.twoFactorLastStep.lt));
                    if (!ok) return { count: 0 };
                }
                Object.assign(db.row, data);
                return { count: 1 };
            }),
        },
        // array_remove(...) WHERE id = $2 AND $1 = ANY(codes), as a tagged template.
        $executeRaw: vi.fn(async (_strings: TemplateStringsArray, hash: string) => {
            if (!db.row.twoFactorRecoveryCodes.includes(hash)) return 0;
            db.row.twoFactorRecoveryCodes = db.row.twoFactorRecoveryCodes.filter((h) => h !== hash);
            return 1;
        }),
    },
}));

import {
    RECOVERY_CODE_COUNT, TwoFactorError, beginEnrolment, confirmEnrolment, disableTwoFactor,
    generateRecoveryCode, hashRecoveryCode, verifySecondFactor,
} from './two-factor.service.js';
import { open } from '../lib/secret-box.js';

const fresh = (): Row => ({ id: 'admin_1', email: 'admin@example.com', twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [], twoFactorLastStep: null });
const currentCode = (secret: string, offset = 0) => totpAtStep(secret, totpStep(Date.now()) + offset);

async function enrol(): Promise<{ secret: string; codes: string[] }> {
    const { secret } = await beginEnrolment(db.row);
    const codes = await confirmEnrolment(db.row.id, currentCode(secret));
    return { secret, codes };
}

beforeEach(() => {
    // Pin the clock 5 s into a 30 s step so no test can straddle a step boundary.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime((Math.floor(1_800_000_000 / 30) * 30 + 5) * 1000);
    vi.stubEnv('TWO_FACTOR_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
    db.row = fresh();
});

describe('enrolment', () => {
    it('stores the secret encrypted and inactive until a valid code confirms it', async () => {
        const { secret, otpauthUri } = await beginEnrolment(db.row);
        expect(otpauthUri).toContain(`secret=${secret}`);
        expect(db.row.twoFactorEnabled).toBe(false);
        expect(db.row.twoFactorSecret).not.toBeNull();
        expect(db.row.twoFactorSecret).not.toContain(secret);
        expect(open(db.row.twoFactorSecret!, 'admin_1')).toBe(secret);
    });

    it('turns on only with a correct code, then issues ten single-use recovery codes, stored hashed', async () => {
        const { secret } = await beginEnrolment(db.row);
        await expect(confirmEnrolment('admin_1', '000000')).rejects.toMatchObject({ code: 'INVALID_CODE' });
        expect(db.row.twoFactorEnabled).toBe(false);

        const codes = await confirmEnrolment('admin_1', currentCode(secret));
        expect(db.row.twoFactorEnabled).toBe(true);
        expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
        expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
        expect(codes.every((c) => /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/.test(c))).toBe(true);
        expect(db.row.twoFactorRecoveryCodes).toEqual(codes.map(hashRecoveryCode));
        expect(JSON.stringify(db.row)).not.toContain(codes[0]!);
        expect(db.row.twoFactorLastStep).toBe(totpStep(Date.now()));
    });

    it('refuses to confirm without a pending setup, to start again once enabled, and to confirm twice', async () => {
        await expect(confirmEnrolment('admin_1', '123456')).rejects.toBeInstanceOf(TwoFactorError);
        const { secret } = await enrol();
        await expect(beginEnrolment(db.row)).rejects.toMatchObject({ code: 'ALREADY_ENABLED' });
        await expect(confirmEnrolment('admin_1', currentCode(secret, 1))).rejects.toBeInstanceOf(TwoFactorError);
    });

    it('lets setup be restarted before confirmation, replacing the earlier secret', async () => {
        const first = await beginEnrolment(db.row);
        const second = await beginEnrolment(db.row);
        expect(second.secret).not.toBe(first.secret);
        await expect(confirmEnrolment('admin_1', currentCode(first.secret))).rejects.toMatchObject({ code: 'INVALID_CODE' });
        await expect(confirmEnrolment('admin_1', currentCode(second.secret))).resolves.toHaveLength(RECOVERY_CODE_COUNT);
    });
});

describe('second factor at sign-in', () => {
    it('accepts an authenticator code once and rejects its replay, but accepts the next step', async () => {
        const { secret } = await enrol(); // enrolment consumed the current step
        const next = currentCode(secret, 1); // within the drift window, and newer than the last accepted step
        expect(await verifySecondFactor({ ...db.row }, { totpCode: currentCode(secret) })).toBe(false); // already used at enrolment
        expect(await verifySecondFactor({ ...db.row }, { totpCode: next })).toBe(true);
        expect(await verifySecondFactor({ ...db.row }, { totpCode: next })).toBe(false); // replay
    });

    it('lets only one of two simultaneous uses of the same code succeed', async () => {
        const { secret } = await enrol();
        const code = currentCode(secret, 1);
        const stale = { ...db.row }; // both requests read the row before either writes
        const results = await Promise.all([verifySecondFactor(stale, { totpCode: code }), verifySecondFactor(stale, { totpCode: code })]);
        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('rejects a wrong code and an account with no secret', async () => {
        const { secret } = await enrol();
        expect(await verifySecondFactor({ ...db.row }, { totpCode: currentCode(secret, 5) })).toBe(false);
        expect(await verifySecondFactor({ ...fresh() }, { totpCode: '123456' })).toBe(false);
        expect(await verifySecondFactor({ ...db.row }, {})).toBe(false);
    });

    it('spends a recovery code exactly once, whatever the case or dashes', async () => {
        const { codes } = await enrol();
        const typed = codes[0]!.toLowerCase().replace(/-/g, ' ');
        expect(await verifySecondFactor({ ...db.row }, { recoveryCode: typed })).toBe(true);
        expect(db.row.twoFactorRecoveryCodes).toHaveLength(RECOVERY_CODE_COUNT - 1);
        expect(await verifySecondFactor({ ...db.row }, { recoveryCode: codes[0]! })).toBe(false);
        expect(await verifySecondFactor({ ...db.row }, { recoveryCode: codes[1]! })).toBe(true);
        expect(await verifySecondFactor({ ...db.row }, { recoveryCode: 'AAAA-BBBB-CCCC-DDDD' })).toBe(false);
    });

    it('generates unbiased-looking, unique recovery codes', () => {
        const batch = new Set(Array.from({ length: 200 }, generateRecoveryCode));
        expect(batch.size).toBe(200);
    });
});

describe('disabling', () => {
    it('erases the secret, the recovery codes and the replay marker', async () => {
        await enrol();
        await disableTwoFactor('admin_1');
        expect(db.row).toMatchObject({ twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [], twoFactorLastStep: null });
    });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
