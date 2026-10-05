import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { decryptOutboxPayload, encryptOutboxPayload, enqueueOutbox, outboxEnabled, outboxKeys } from './outbox.js';

beforeEach(() => {
    vi.stubEnv('OUTBOX_ENABLED', 'true');
    vi.stubEnv('OUTBOX_ACTIVE_KEY', 'v1');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', JSON.stringify({ v1: Buffer.alloc(32, 7).toString('base64') }));
});
afterEach(() => vi.unstubAllEnvs());

it('encrypts PII/tokens with random IVs, authenticates row context and rejects tampering', () => {
    const payload = { recipient: 'customer@example.test', token: 'secret-reset-link', message: 'private message' };
    const a = encryptOutboxPayload(payload, 'row:EMAIL:1');
    const b = encryptOutboxPayload(payload, 'row:EMAIL:1');
    expect(a).not.toBe(b);
    for (const value of Object.values(payload)) expect(a).not.toContain(value);
    expect(decryptOutboxPayload(a, 'row:EMAIL:1')).toEqual(payload);
    expect(() => decryptOutboxPayload(a, 'another-row:EMAIL:1')).toThrow();
    const segments = a.split('.');
    const encrypted = Buffer.from(segments[4]!, 'base64url');
    encrypted[0] = encrypted[0]! ^ 1;
    segments[4] = encrypted.toString('base64url');
    expect(() => decryptOutboxPayload(segments.join('.'), 'row:EMAIL:1')).toThrow();
});
it('keeps old encrypted rows readable across a writer-key rotation', () => {
    const old = encryptOutboxPayload({ token: 'old' }, 'a:EMAIL:1');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', JSON.stringify({ v1: Buffer.alloc(32, 7).toString('base64'), v2: Buffer.alloc(32, 9).toString('base64') }));
    vi.stubEnv('OUTBOX_ACTIVE_KEY', 'v2');
    expect(decryptOutboxPayload(old, 'a:EMAIL:1')).toEqual({ token: 'old' });
    expect(encryptOutboxPayload({}, 'b:EMAIL:1').split('.')[1]).toBe('v2');
});
it.each(['off', 'TRUE', '1', ''])('fails closed for ambiguous enable flag %s', value => {
    vi.stubEnv('OUTBOX_ENABLED', value);
    expect(() => outboxEnabled()).toThrow();
});
it.each(['{}', '{bad', JSON.stringify({ v1: 'short' }), JSON.stringify({ v1: Buffer.alloc(31).toString('base64') })])('rejects invalid enabled key configuration %s', keys => {
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', keys);
    expect(() => outboxEnabled()).toThrow();
});
it('does not require keys or issue writes when disabled', async () => {
    vi.stubEnv('OUTBOX_ENABLED', 'false');
    vi.stubEnv('OUTBOX_ENCRYPTION_KEYS', undefined);
    const upsert = vi.fn();
    const tx = { outboxMessage: { upsert } } as unknown as Prisma.TransactionClient;
    expect(await enqueueOutbox(tx, { kind: 'EMAIL', dedupeKey: 'disabled', payload: {} })).toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
});
it('deduplicates by logical key without overwriting the first frozen payload', async () => {
    const stored = new Map<string, { id: string; encryptedPayload: string; kind: string }>();
    const upsert = vi.fn(async ({ where, create, update }: { where: { dedupeKey: string }; create: { id: string; encryptedPayload: string; kind: string }; update: object }) => {
        expect(update).toEqual({});
        if (!stored.has(where.dedupeKey)) stored.set(where.dedupeKey, create);
        return { id: stored.get(where.dedupeKey)!.id };
    });
    const tx = { outboxMessage: { upsert } } as unknown as Prisma.TransactionClient;
    const first = await enqueueOutbox(tx, { kind: 'EMAIL', dedupeKey: 'order:1', payload: { total: 10 } });
    expect(await enqueueOutbox(tx, { kind: 'EMAIL', dedupeKey: 'order:1', payload: { total: 99 } })).toBe(first);
    expect(decryptOutboxPayload(stored.get('order:1')!.encryptedPayload, `${first}:EMAIL:1`)).toEqual({ total: 10 });
});
it('rejects oversized payloads and unsafe metadata instead of putting PII in a dedupe key', async () => {
    expect(() => encryptOutboxPayload('x'.repeat(256 * 1024), 'a')).toThrow('256KiB');
    await expect(enqueueOutbox({} as Prisma.TransactionClient, { kind: 'EMAIL', dedupeKey: 'email@example.test', payload: {} })).rejects.toThrow('dedupe');
    expect(outboxKeys().active).toBe('v1');
});
