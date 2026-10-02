import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { enqueueOutbox, outboxEnabled } from './outbox.js';

export async function enqueueRevalidation(tx: Prisma.TransactionClient, paths: string[]): Promise<void> {
    const unique = [...new Set(paths)];
    if (!unique.length || !outboxEnabled()) return;
    if (unique.length > 32 || unique.some(path => path.length > 512 || !/^\/(?:$|products(?:\/[^/?#]+)?$|categories$|journal(?:\/[^/?#]+)?$|recipes(?:\/[^/?#]+)?$|gifts(?:\/[^/?#]+)?$|search$)/.test(path))) {
        throw new Error('REVALIDATION_INVALID_PAYLOAD');
    }
    await enqueueOutbox(tx, { kind: 'REVALIDATION', dedupeKey: `revalidation:${randomUUID()}`, payload: { paths: unique } });
}

/** Enabled enqueue shares the business transaction. Off mode preserves the existing write path. */
export async function publicMutation<T>(work: (tx: Prisma.TransactionClient) => Promise<T>, paths: (result: T) => string[], legacy?: () => Promise<T>): Promise<T> {
    if (!outboxEnabled()) return legacy ? legacy() : work(prisma);
    return prisma.$transaction(async tx => {
        const result = await work(tx);
        await enqueueRevalidation(tx, paths(result));
        return result;
    });
}
