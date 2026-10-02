import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    audit: vi.fn(),
    construct: vi.fn(),
}));
vi.mock('resend', () => ({
    Resend: class {
        emails = { send: mocks.send };
        constructor(key: string) { mocks.construct(key); }
    },
}));
vi.mock('./audit.service.js', () => ({ writeAuditLog: mocks.audit }));

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 're_fixture_never_sent');
    vi.stubEnv('EMAIL_FROM', 'orders@shop.example');
    mocks.send.mockResolvedValue({ data: { id: 'fixture' }, error: null });
    mocks.audit.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network must not be used by email unit tests'); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('verification email uses public BFF entry point', () => {
    it('uses the first trimmed frontend origin and strips trailing slashes', async () => {
        vi.stubEnv('FRONTEND_URL', '  https://shop.example/// , https://secondary.example ');
        vi.stubEnv('API_URL', 'https://private-api.example');
        const { sendVerificationEmail } = await import('./email.service.js');
        await sendVerificationEmail({ to: 'customer@fixture.example', token: 'fixture-token' });
        expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            from: 'orders@shop.example', to: 'customer@fixture.example', subject: 'Verify your Aranya Ceylon email',
        }));
        const html = mocks.send.mock.calls[0]![0].html as string;
        expect(html).toContain('href="https://shop.example/api/auth/verify?token=fixture-token"');
        expect(html).not.toContain('private-api.example');
        expect(html).not.toContain('secondary.example');
        expect(html).not.toContain('shop.example//');
        expect(mocks.audit).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });
    it('keeps token encoding intact through the BFF URL', async () => {
        vi.stubEnv('FRONTEND_URL', 'https://shop.example');
        const token = 'fixture+/=?& #"<>%';
        const { sendVerificationEmail } = await import('./email.service.js');
        await sendVerificationEmail({ to: 'customer@fixture.example', token });
        const html = mocks.send.mock.calls[0]![0].html as string;
        const link = /href="([^"]+)"/.exec(html)![1]!;
        expect(link).toBe(`https://shop.example/api/auth/verify?token=${encodeURIComponent(token)}`);
        const url = new URL(link);
        expect(url.pathname).toBe('/api/auth/verify');
        expect(url.searchParams.get('token')).toBe(token);
        expect([...url.searchParams.keys()]).toEqual(['token']);
        expect(fetch).not.toHaveBeenCalled();
    });
    it('preserves the local frontend default when origin is unset', async () => {
        vi.stubEnv('FRONTEND_URL', undefined);
        const { sendVerificationEmail } = await import('./email.service.js');
        await sendVerificationEmail({ to: 'customer@fixture.example', token: 'local-fixture' });
        expect(mocks.send.mock.calls[0]![0].html).toContain('href="http://localhost:3000/api/auth/verify?token=local-fixture"');
        expect(fetch).not.toHaveBeenCalled();
    });
    it('retains SDK error auditing and rejects failed sends without network', async () => {
        vi.stubEnv('FRONTEND_URL', 'https://shop.example');
        mocks.send.mockResolvedValueOnce({ data: null, error: { name: 'fixture_error', message: 'fixture send denied' } });
        const { sendVerificationEmail } = await import('./email.service.js');
        await expect(sendVerificationEmail({ to: 'customer@fixture.example', token: 'fixture-token' })).rejects.toThrow('fixture_error: fixture send denied');
        expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
            event: 'EMAIL_SEND_FAILED', targetType: 'Email', targetId: 'customer@fixture.example',
            diff: { type: 'EMAIL_VERIFICATION', error: 'fixture_error: fixture send denied' },
        });
        expect(fetch).not.toHaveBeenCalled();
    });
    it('retains transport failure auditing and rethrows the original failure', async () => {
        vi.stubEnv('FRONTEND_URL', 'https://shop.example');
        const failure = new Error('fixture offline');
        mocks.send.mockRejectedValueOnce(failure);
        const { sendVerificationEmail } = await import('./email.service.js');
        await expect(sendVerificationEmail({ to: 'customer@fixture.example', token: 'fixture-token' })).rejects.toBe(failure);
        expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
            event: 'EMAIL_SEND_FAILED', targetType: 'Email', targetId: 'customer@fixture.example',
            diff: { type: 'EMAIL_VERIFICATION', error: 'fixture offline' },
        });
        expect(fetch).not.toHaveBeenCalled();
    });
});
