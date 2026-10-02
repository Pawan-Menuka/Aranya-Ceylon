import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { outboxEnabled } from '../lib/outbox.js';
import { outboxStatus, replayDeadOutbox } from './outboxWorker.js';

export async function runOutboxOps(command: string, id?: string): Promise<unknown> {
    if (!outboxEnabled()) throw new Error('Outbox is disabled');
    if (command === 'status') return outboxStatus();
    if (command === 'replay' && id && /^[a-f0-9-]{36}$/.test(id)) return { accepted: await replayDeadOutbox(id) };
    throw new Error('Usage: outboxOps status | replay <uuid>; expired/uncertain/invalid payloads cannot be replayed');
}
if (typeof require !== 'undefined' && require.main === module) {
    void runOutboxOps(process.argv[2] ?? '', process.argv[3])
        .then(result => { console.log(JSON.stringify(result)); })
        .catch(() => { console.error('[outbox-ops] command failed'); process.exitCode = 1; })
        .finally(() => prisma.$disconnect());
}
