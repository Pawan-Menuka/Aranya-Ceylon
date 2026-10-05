import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { requestDouble, responseDouble } from '../test/httpDoubles.js';
import { decryptOutboxPayload } from '../lib/outbox.js';

type UserRow = { id: string; email: string; verified: boolean };
type TokenRow = { id: string; tokenHash: string; type: string; expiresAt: Date };
type QueueRow = { id: string; kind: string; encryptedPayload: string; dedupeKey: string; expiresAt?: Date };
const state = vi.hoisted(() => ({ users: [] as UserRow[], tokens: [] as TokenRow[], queue: [] as QueueRow[], failQueue: false, send: vi.fn() }));
vi.mock('@node-rs/bcrypt', () => ({ hash: vi.fn(async () => 'unconditional-hash'), verify: vi.fn() }));
vi.mock('../lib/jwt.js', () => ({ signAccessToken: vi.fn() }));
vi.mock('../services/audit.service.js', () => ({ writeAuditLog: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send: state.send }; } }));
vi.mock('../lib/prisma.js', () => ({ prisma: {
    async $transaction(work: (tx: unknown) => Promise<unknown>) {
        const users = [...state.users], tokens = [...state.tokens], queue = [...state.queue];
        const result = await work({
            user: {
                async create({ data }: { data: { email: string; verified: boolean } }) {
                    if (users.some(user => user.email === data.email)) throw new Prisma.PrismaClientKnownRequestError('Duplicate', { code: 'P2002', clientVersion: 'test' });
                    const user = { ...data, id: 'user-1' }; users.push(user); return user;
                },
                async findUnique({ where }: { where: { email: string } }) { return users.find(user => user.email === where.email) ?? null; },
            },
            token: { async create({ data }: { data: Omit<TokenRow, 'id'> }) { const row = { ...data, id: `token-${tokens.length}` }; tokens.push(row); return row; } },
            outboxMessage: { async upsert({ create }: { create: QueueRow }) {
                if (state.failQueue) throw new Error('queue unavailable');
                const row = queue.find(row => row.dedupeKey === create.dedupeKey) ?? create;
                if (!queue.includes(row)) queue.push(row); return { id: row.id };
            } },
        });
        state.users = users; state.tokens = tokens; state.queue = queue;
        return result;
    },
} }));
import { register, forgotPassword, resendVerification } from './auth.controller.js';
beforeEach(() => {
    state.users = []; state.tokens = []; state.queue = []; state.failQueue = false; state.send.mockClear();
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('OUTBOX_ENABLED', 'true'); vi.stubEnv('OUTBOX_ACTIVE_KEY', 'v1');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', JSON.stringify({ v1: Buffer.alloc(32, 7).toString('base64') }));
});
afterEach(() => vi.unstubAllEnvs());
const req = (email = 'customer@example.test') => requestDouble({ body: { email, name: 'Test', password: 'safe-password' } });

it('commits user, hashed token and encrypted frozen verification mail together without sending or creating a session', async () => {
    const res = responseDouble();
    await register(req(), res);
    expect(res.statusCode).toBe(201);
    expect(state.users).toHaveLength(1); expect(state.tokens).toHaveLength(1); expect(state.queue).toHaveLength(1);
    expect(state.tokens[0]!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(state.queue[0]!.encryptedPayload).not.toContain('customer@example.test');
    const row = state.queue[0]!;
    const payload = decryptOutboxPayload(row.encryptedPayload, `${row.id}:EMAIL:1`) as { mail: { html: string; to: string } };
    expect(payload.mail.html).toContain('/api/auth/verify?token=');
    expect(payload.mail.to).toBe('customer@example.test');
    expect(state.send).not.toHaveBeenCalled();
});
it('rolls back user and token creation when queue persistence fails', async () => {
    state.failQueue = true;
    await expect(register(req(), responseDouble())).rejects.toThrow('queue unavailable');
    expect(state.users).toEqual([]); expect(state.tokens).toEqual([]); expect(state.queue).toEqual([]);
    expect(state.send).not.toHaveBeenCalled();
});
it('returns byte-identical neutral registration response for existing email without issuing duplicate work', async () => {
    const first = responseDouble(), duplicate = responseDouble();
    await register(req(), first); await register(req(), duplicate);
    expect(duplicate.statusCode).toBe(first.statusCode); expect(duplicate.body).toEqual(first.body);
    expect(state.tokens).toHaveLength(1); expect(state.queue).toHaveLength(1);
});
it.each([forgotPassword, resendVerification])('keeps existent/nonexistent auth request bodies neutral and makes no provider call', async handler => {
    state.users.push({ id: 'user-1', email: 'customer@example.test', verified: false });
    const actual = responseDouble(), absent = responseDouble();
    await handler(req(), actual); await handler(req('absent@example.test'), absent);
    expect(actual.statusCode).toBe(200); expect(absent.body).toEqual(actual.body);
    expect(state.tokens).toHaveLength(1); expect(state.queue).toHaveLength(1);
    expect(state.queue[0]!.expiresAt!.getTime()).toBeLessThan(state.tokens[0]!.expiresAt.getTime());
    expect(state.send).not.toHaveBeenCalled();
});
it('rolls back a reset token on queue failure and never emails a usable uncommitted link', async () => {
    state.users.push({ id: 'user-1', email: 'customer@example.test', verified: true }); state.failQueue = true;
    await expect(forgotPassword(req(), responseDouble())).rejects.toThrow('queue unavailable');
    expect(state.tokens).toEqual([]); expect(state.queue).toEqual([]); expect(state.send).not.toHaveBeenCalled();
});
