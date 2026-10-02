import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';

export type OutboxEvent = { kind: 'EMAIL' | 'REVALIDATION'; dedupeKey: string; payload: unknown; expiresAt?: Date };
export function outboxEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const value = env.OUTBOX_ENABLED ?? 'false';
    if (value !== 'true' && value !== 'false') throw new Error('OUTBOX_ENABLED must be true or false');
    if (value === 'true') outboxKeys(env);
    return value === 'true';
}
export function outboxKeys(env: NodeJS.ProcessEnv = process.env) {
    let input: unknown;
    try { input = JSON.parse(env.OUTBOX_ENCRYPTION_KEYS ?? '{}'); } catch { throw new Error('Invalid OUTBOX_ENCRYPTION_KEYS'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid OUTBOX_ENCRYPTION_KEYS');
    const keys = new Map<string, Buffer>();
    for (const [id, value] of Object.entries(input)) {
        if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id) || typeof value !== 'string') throw new Error('Invalid outbox key');
        const key = Buffer.from(value, 'base64');
        if (key.length !== 32 || key.toString('base64') !== value) throw new Error('Outbox keys must be canonical base64 32-byte keys');
        keys.set(id, key);
    }
    const active = env.OUTBOX_ACTIVE_KEY ?? '';
    if (!keys.has(active)) throw new Error('OUTBOX_ACTIVE_KEY must select a configured key');
    return { keys, active };
}
export function encryptOutboxPayload(payload: unknown, associated: string, env: NodeJS.ProcessEnv = process.env): string {
    const { keys, active } = outboxKeys(env);
    const json = JSON.stringify(payload);
    if (!json || Buffer.byteLength(json) > 256 * 1024) throw new Error('Outbox payload exceeds 256KiB');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keys.get(active)!, iv);
    cipher.setAAD(Buffer.from(associated));
    const encrypted = Buffer.concat([cipher.update(json), cipher.final()]);
    return [1, active, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function decryptOutboxPayload(envelope: string, associated: string, env: NodeJS.ProcessEnv = process.env): unknown {
    const [version, id, iv, tag, data, extra] = envelope.split('.');
    const key = outboxKeys(env).keys.get(id ?? '');
    if (version !== '1' || !key || !iv || !tag || !data || extra !== undefined) throw new Error('Invalid outbox envelope');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(associated));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString()) as unknown;
}
export async function enqueueOutbox(tx: Prisma.TransactionClient, event: OutboxEvent): Promise<string | undefined> {
    if (!outboxEnabled()) return undefined;
    if (!/^[a-zA-Z0-9:_./-]{1,200}$/.test(event.dedupeKey)) throw new Error('Invalid outbox dedupe key');
    const id = randomUUID();
    const encryptedPayload = encryptOutboxPayload(event.payload, `${id}:${event.kind}:1`);
    const row = await tx.outboxMessage.upsert({ where: { dedupeKey: event.dedupeKey }, update: {}, create: {
        id, kind: event.kind, dedupeKey: event.dedupeKey, encryptedPayload, expiresAt: event.expiresAt,
    }, select: { id: true } });
    return row.id;
}
