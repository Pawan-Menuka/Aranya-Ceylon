import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface JobLeaseHandle {
    name: string; owner: string; fence: bigint;
    assertOwned(tx: Prisma.TransactionClient): Promise<void>;
    release(): Promise<void>;
}
export function distributedJobsEnabled(): boolean {
    const value = process.env.DISTRIBUTED_JOBS_ENABLED ?? 'false';
    if (!['true', 'false'].includes(value)) throw new Error('DISTRIBUTED_JOBS_ENABLED must be true or false');
    return value === 'true';
}
export async function acquireJobLease(name: string): Promise<JobLeaseHandle | undefined> {
    if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(name)) throw new Error('Invalid lease name');
    const owner = randomUUID();
    const rows = await prisma.$transaction(tx => tx.$queryRaw<Array<{ fence: bigint }>>`
        INSERT INTO "JobLease" ("name", "owner", "fence", "expiresAt")
        VALUES (${name}, ${owner}, 1, (clock_timestamp() AT TIME ZONE 'UTC') + interval '60 seconds')
        ON CONFLICT ("name") DO UPDATE SET "owner" = EXCLUDED."owner",
        "fence" = "JobLease"."fence" + 1, "expiresAt" = EXCLUDED."expiresAt"
        WHERE "JobLease"."expiresAt" <= clock_timestamp() AT TIME ZONE 'UTC' RETURNING "fence"`, { timeout: 5_000, maxWait: 2_000 });
    const fence = rows[0]?.fence;
    if (fence === undefined) return undefined;
    return { name, owner, fence,
        async assertOwned(tx) {
            const owned = await tx.$queryRaw<Array<{ name: string }>>`SELECT "name" FROM "JobLease"
                WHERE "name" = ${name} AND "owner" = ${owner} AND "fence" = ${fence}
                AND "expiresAt" > clock_timestamp() AT TIME ZONE 'UTC' FOR UPDATE`;
            if (!owned.length) throw new Error('JOB_LEASE_LOST');
        },
        async release() {
            await prisma.jobLease.updateMany({ where: { name, owner, fence }, data: { expiresAt: new Date(0) } });
        },
    };
}
export async function withJobLease(name: string, work: (lease?: JobLeaseHandle) => Promise<void>): Promise<void> {
    if (!distributedJobsEnabled()) return work();
    const lease = await acquireJobLease(name);
    if (!lease) return;
    try { await work(lease); } finally { await lease.release(); }
}
