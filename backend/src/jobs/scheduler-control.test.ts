import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const schedule = vi.hoisted(() => vi.fn());
vi.mock('node-cron', () => ({ default: { schedule } }));
vi.mock('../lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../services/email.service.js', () => ({ sendLowStockAlert: vi.fn(), sendAbandonedCartEmail: vi.fn() }));
vi.mock('../lib/revalidate.js', () => ({ revalidateFrontend: vi.fn() }));
vi.mock('../controllers/webhook.controller.js', () => ({ cancelOrderAndReleaseStock: vi.fn() }));

beforeEach(() => {
    vi.resetModules();
    schedule.mockClear();
    vi.stubEnv('SCHEDULED_JOBS_ENABLED', undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

it('preserves the default six schedules and starts them once per process', async () => {
    const { startAllJobs } = await import('./scheduler.js');
    startAllJobs();
    startAllJobs();
    expect(schedule.mock.calls.map(call => call[0])).toEqual([
        '* * * * *', '0 * * * *', '0 8 * * *',
        // Stale-order sweep: every 10 minutes, so an unpaid order's stock is
        // released close to the 60-minute reservation window, not an hour late.
        '*/10 * * * *', '0 3 * * *', '30 * * * *',
    ]);
    for (const call of schedule.mock.calls) {
        expect(call[2]).toEqual({ noOverlap: true });
    }
});

it('registers no schedules when explicitly disabled', async () => {
    vi.stubEnv('SCHEDULED_JOBS_ENABLED', 'false');
    const { startAllJobs } = await import('./scheduler.js');
    startAllJobs();
    expect(schedule).not.toHaveBeenCalled();
});

it('rejects an ambiguous scheduler setting', async () => {
    vi.stubEnv('SCHEDULED_JOBS_ENABLED', 'off');
    const { startAllJobs } = await import('./scheduler.js');
    expect(() => startAllJobs()).toThrow('SCHEDULED_JOBS_ENABLED must be true or false');
    expect(schedule).not.toHaveBeenCalled();
});
