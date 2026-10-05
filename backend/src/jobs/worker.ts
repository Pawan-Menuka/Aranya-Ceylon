import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { outboxWorkerEnabled, runOutboxBatch } from './outboxWorker.js';
import { distributedJobsEnabled, acquireJobLease } from './jobLease.js';
import { dashboardRollupsEnabled, rebuildDashboardRollups } from '../services/dashboard-rollups.js';
import { startAllJobs } from './scheduler.js';
import { stopLeasedJobs } from './leasedScheduler.js';

export async function runWorkerTick(): Promise<void> {
    const deadline = Date.now() + 40_000;
    await runOutboxBatch();
    if (!dashboardRollupsEnabled() || Date.now() >= deadline) return;
    const lease = await acquireJobLease('dashboard-rollups');
    if (!lease) return;
    try {
        const remaining = deadline - Date.now();
        if (remaining > 0) await rebuildDashboardRollups(lease, { maxDays: 4, timeBudgetMs: Math.min(15_000, remaining) });
    } finally { await lease.release(); }
}
export async function startWorker(): Promise<() => Promise<void>> {
    if (!outboxWorkerEnabled()) throw new Error('Dedicated worker requires OUTBOX_WORKER_ENABLED=true');
    if (!distributedJobsEnabled()) throw new Error('Dedicated worker requires DISTRIBUTED_JOBS_ENABLED=true');
    dashboardRollupsEnabled();
    startAllJobs();
    let stopping = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = Promise.resolve();
    const tick = () => {
        if (stopping) return;
        current = runWorkerTick().catch(() => { console.error('[worker] tick failed', { code: 'WORKER_TICK_FAILED' }); });
        void current.finally(() => { if (!stopping) timer = setTimeout(tick, 1000); });
    };
    tick();
    return async () => { stopping = true; if (timer) clearTimeout(timer); await current; await stopLeasedJobs(); await prisma.$disconnect(); };
}
// Importing the worker in a unit test never starts cron, delivery, or a database connection.
if (typeof require !== 'undefined' && require.main === module) {
    void startWorker().then(stop => {
        process.once('SIGTERM', () => { void stop().then(() => process.exit(0)); });
        process.once('SIGINT', () => { void stop().then(() => process.exit(0)); });
    }).catch(() => { console.error('[worker] invalid configuration or startup failure'); process.exitCode = 1; });
}
