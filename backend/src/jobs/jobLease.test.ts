import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock('../lib/prisma.js', () => ({ prisma: { $queryRaw: mocks.query, $transaction: (work: (tx: { $queryRaw: typeof mocks.query }) => Promise<unknown>) => work({ $queryRaw: mocks.query }), jobLease: { updateMany: mocks.release } } }));
import { acquireJobLease, distributedJobsEnabled, withJobLease } from './jobLease.js';
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('DISTRIBUTED_JOBS_ENABLED', 'true'); });
afterEach(() => vi.unstubAllEnvs());

it('runs one owner, skips the competing runner, and fences transactions after takeover', async () => {
    mocks.query.mockResolvedValueOnce([{ fence: 3n }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ fence: 4n }]);
    const first = await acquireJobLease('cleanup');
    expect(await acquireJobLease('cleanup')).toBeUndefined();
    const replacement = await acquireJobLease('cleanup');
    expect(replacement!.fence).toBe(4n);
    expect(replacement!.owner).not.toBe(first!.owner);
    const guard = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ name: 'cleanup' }]);
    const tx = { $queryRaw: guard } as unknown as Prisma.TransactionClient;
    await expect(first!.assertOwned(tx)).rejects.toThrow('JOB_LEASE_LOST');
    await expect(replacement!.assertOwned(tx)).resolves.toBeUndefined();
    expect(guard.mock.calls[0]!.slice(1)).toEqual(['cleanup', first!.owner, 3n]);
    expect((guard.mock.calls[0]![0] as TemplateStringsArray).join('')).toContain('FOR UPDATE');
});
it('releases only its own fence after a failure; it never removes another owner', async () => {
    mocks.query.mockResolvedValue([{ fence: 8n }]);
    await expect(withJobLease('job', async () => { throw new Error('job failed'); })).rejects.toThrow('job failed');
    expect(mocks.release).toHaveBeenCalledWith({ where: { name: 'job', owner: expect.any(String), fence: 8n }, data: { expiresAt: new Date(0) } });
});
it('preserves legacy behavior with the flag off and rejects ambiguous flags', async () => {
    vi.stubEnv('DISTRIBUTED_JOBS_ENABLED', 'false');
    const work = vi.fn().mockResolvedValue(undefined);
    await withJobLease('job', work);
    expect(work).toHaveBeenCalledOnce();
    expect(mocks.query).not.toHaveBeenCalled();
    vi.stubEnv('DISTRIBUTED_JOBS_ENABLED', 'yes');
    expect(() => distributedJobsEnabled()).toThrow();
});
