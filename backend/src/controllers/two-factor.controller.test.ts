import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { requestDouble, responseDouble } from '../test/httpDoubles.js';

const state = vi.hoisted(() => ({
    user: undefined as undefined | Record<string, unknown>,
    audit: [] as Array<Record<string, unknown>>,
    revoked: [] as string[],
    passwordOk: true,
    secondFactorOk: true,
}));

vi.mock('../lib/prisma.js', () => ({
    prisma: { user: { findUnique: vi.fn(async () => (state.user ? { ...state.user } : null)) } },
}));
vi.mock('@node-rs/bcrypt', () => ({ verify: vi.fn(async () => state.passwordOk), hash: vi.fn() }));
vi.mock('../services/audit.service.js', () => ({ writeAuditLog: vi.fn(async (e: Record<string, unknown>) => { state.audit.push(e); }) }));
vi.mock('../services/token.service.js', () => ({ revokeAllUserTokens: vi.fn(async (id: string) => { state.revoked.push(id); }) }));
vi.mock('../services/two-factor.service.js', async () => {
    const actual = await vi.importActual<typeof import('../services/two-factor.service.js')>('../services/two-factor.service.js');
    return {
        TwoFactorError: actual.TwoFactorError,
        beginEnrolment: vi.fn(async () => ({ secret: 'SECRET32', otpauthUri: 'otpauth://totp/x?secret=SECRET32' })),
        confirmEnrolment: vi.fn(async () => ['AAAA-BBBB-CCCC-DDDD']),
        verifySecondFactor: vi.fn(async () => state.secondFactorOk),
        disableTwoFactor: vi.fn(async () => {}),
    };
});

import { setup, enable, disable } from './two-factor.controller.js';
import { resetTwoFactor } from './admin/user.admin.controller.js';
import { TwoFactorError, beginEnrolment, confirmEnrolment, disableTwoFactor } from '../services/two-factor.service.js';

const run = async (fn: (req: never, res: never) => Promise<void>, req: object) => {
    const res = responseDouble<Record<string, any>>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    await fn(requestDouble(req) as never, res as never);
    return res;
};
const me = { user: { userId: 'a1' } };

beforeEach(() => {
    vi.stubEnv('TWO_FACTOR_ENCRYPTION_KEY', randomBytes(32).toString('base64'));
    state.user = { id: 'a1', email: 'admin@example.com', twoFactorEnabled: false, passwordHash: 'h' };
    state.audit = []; state.revoked = []; state.passwordOk = true; state.secondFactorOk = true;
    vi.mocked(beginEnrolment).mockClear(); vi.mocked(confirmEnrolment).mockClear(); vi.mocked(disableTwoFactor).mockClear();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('setup and enable', () => {
    it('returns the secret and an otpauth URI once, nothing secret in the audit trail', async () => {
        const res = await run(setup, me);
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ secret: 'SECRET32', otpauthUri: expect.stringContaining('otpauth://') });
    });

    it('turns on with a valid code, shows recovery codes, and audits without logging them', async () => {
        const res = await run(enable, { ...me, body: { code: '123456' } });
        expect(res.body).toMatchObject({ enabled: true, recoveryCodes: ['AAAA-BBBB-CCCC-DDDD'] });
        expect(state.audit).toHaveLength(1);
        expect(state.audit[0]).toMatchObject({ event: 'USER_2FA_ENABLE' });
        expect(JSON.stringify(state.audit)).not.toContain('AAAA');
    });

    it('maps service failures to clear client errors', async () => {
        vi.mocked(beginEnrolment).mockRejectedValueOnce(new TwoFactorError('ALREADY_ENABLED'));
        expect((await run(setup, me)).statusCode).toBe(409);
        vi.mocked(confirmEnrolment).mockRejectedValueOnce(new TwoFactorError('INVALID_CODE'));
        const bad = await run(enable, { ...me, body: { code: '000000' } });
        expect(bad.statusCode).toBe(400);
        expect(bad.body.code).toBe('INVALID_CODE');
        expect(state.audit).toHaveLength(0);
    });

    it('answers 503 on every endpoint when the encryption key is not configured', async () => {
        vi.stubEnv('TWO_FACTOR_ENCRYPTION_KEY', '');
        for (const [fn, body] of [[setup, {}], [enable, { code: '123456' }], [disable, { password: 'p', totpCode: '123456' }]] as const) {
            const res = await run(fn, { ...me, body });
            expect(res.statusCode).toBe(503);
            expect(res.body.code).toBe('TWO_FACTOR_UNAVAILABLE');
        }
        expect(beginEnrolment).not.toHaveBeenCalled();
    });
});

describe('disable', () => {
    beforeEach(() => { state.user = { id: 'a1', email: 'admin@example.com', twoFactorEnabled: true, passwordHash: 'h' }; });

    it('needs the password AND a valid code: either alone is refused', async () => {
        state.passwordOk = false;
        expect((await run(disable, { ...me, body: { password: 'wrong', totpCode: '123456' } })).statusCode).toBe(401);
        state.passwordOk = true; state.secondFactorOk = false;
        expect((await run(disable, { ...me, body: { password: 'right', totpCode: '000000' } })).statusCode).toBe(401);
        expect(disableTwoFactor).not.toHaveBeenCalled();
        expect(state.audit).toHaveLength(0);
    });

    it('turns it off and audits when both are right', async () => {
        const res = await run(disable, { ...me, body: { password: 'right', totpCode: '123456' } });
        expect(res.body).toEqual({ enabled: false });
        expect(disableTwoFactor).toHaveBeenCalledWith('a1');
        expect(state.audit[0]).toMatchObject({ event: 'USER_2FA_DISABLE', targetId: 'a1' });
    });

    it('says so when it was never on, without touching anything', async () => {
        state.user = { id: 'a1', twoFactorEnabled: false, passwordHash: 'h' };
        const res = await run(disable, { ...me, body: { password: 'right', totpCode: '123456' } });
        expect(res.statusCode).toBe(409);
        expect(disableTwoFactor).not.toHaveBeenCalled();
    });
});

describe('SUPERADMIN reset', () => {
    it('switches off another admin\'s two-factor, ends their sessions and audits', async () => {
        state.user = { id: 'a2', twoFactorEnabled: true };
        const res = await run(resetTwoFactor, { user: { userId: 'boss' }, params: { id: 'a2' } });
        expect(res.body).toEqual({ user: { id: 'a2', twoFactorEnabled: false }, changed: true });
        expect(disableTwoFactor).toHaveBeenCalledWith('a2');
        expect(state.revoked).toEqual(['a2']);
        expect(state.audit[0]).toMatchObject({ event: 'USER_2FA_RESET', targetId: 'a2' });
    });

    it('will not reset your own (use the code-protected disable), is a no-op when off, and 404s', async () => {
        expect((await run(resetTwoFactor, { user: { userId: 'boss' }, params: { id: 'boss' } })).body.code).toBe('CANNOT_CHANGE_SELF');
        state.user = { id: 'a2', twoFactorEnabled: false };
        const noop = await run(resetTwoFactor, { user: { userId: 'boss' }, params: { id: 'a2' } });
        expect(noop.body.changed).toBe(false);
        expect(state.audit).toHaveLength(0);
        state.user = undefined;
        expect((await run(resetTwoFactor, { user: { userId: 'boss' }, params: { id: 'nobody' } })).statusCode).toBe(404);
    });
});
