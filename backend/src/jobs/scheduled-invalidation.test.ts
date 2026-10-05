import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    callback: undefined as (() => Promise<void>) | undefined,
    due: vi.fn(), publish: vi.fn(), revalidate: vi.fn(),
}));
vi.mock('node-cron', () => ({ default: { schedule: (_expression: string, callback: () => Promise<void>) => { mocks.callback = callback; } } }));
vi.mock('../lib/prisma.js', () => ({ prisma: { blog: { findMany: mocks.due, update: mocks.publish } } }));
vi.mock('../lib/revalidate.js', () => ({ revalidateFrontend: mocks.revalidate }));
vi.mock('../services/email.service.js', () => ({ sendLowStockAlert: vi.fn(), sendAbandonedCartEmail: vi.fn() }));
vi.mock('../controllers/webhook.controller.js', () => ({ cancelOrderAndReleaseStock: vi.fn() }));
import { startScheduledPostsJob } from './scheduler.js';

afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); });

it('invalidates every newly scheduled publication in bounded batches with home, listing and search dependencies', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const due = Array.from({ length: 30 }, (_, i) => ({ id: `blog-${i}`, slug: `story-${i}` }));
    mocks.due.mockResolvedValue(due);
    startScheduledPostsJob();
    await mocks.callback!();
    expect(mocks.publish).toHaveBeenCalledTimes(30);
    expect(mocks.revalidate).toHaveBeenCalledTimes(2);
    const paths = mocks.revalidate.mock.calls.map(call => call[0] as string[]);
    expect(paths.map(batch => batch.length)).toEqual([32, 4]);
    expect(paths.flat()).toEqual(expect.arrayContaining(due.map(blog => `/journal/${blog.slug}`)));
    for (const batch of paths) expect(batch).toEqual(expect.arrayContaining(['/', '/journal', '/search']));
    expect(mocks.publish.mock.invocationCallOrder.at(-1)).toBeLessThan(mocks.revalidate.mock.invocationCallOrder[0]!);
});

it('does not send invalidation traffic when no scheduled post is due', async () => {
    mocks.due.mockResolvedValue([]);
    startScheduledPostsJob();
    await mocks.callback!();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
});

it('waits for and invalidates successful publications when a sibling publication failed, then reports the original failure', async () => {
    const failure = new Error('publication unavailable');
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.due.mockResolvedValue([{ id: 'bad', slug: 'failed' }, { id: 'slow', slug: 'published' }]);
    let finish!: () => void;
    mocks.publish.mockRejectedValueOnce(failure).mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    startScheduledPostsJob();
    const work = mocks.callback!();
    await vi.waitFor(() => expect(mocks.publish).toHaveBeenCalledTimes(2));
    expect(mocks.revalidate).not.toHaveBeenCalled();
    finish();
    await work;
    expect(mocks.revalidate).toHaveBeenCalledWith(['/', '/journal', '/search', '/journal/published']);
    expect(report).toHaveBeenCalledWith('[CRON] Scheduled posts job failed:', failure);
});

it('reports a wholly failed publication batch without invalidating uncommitted posts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.due.mockResolvedValue([{ id: 'bad', slug: 'failed' }]);
    mocks.publish.mockRejectedValue(new Error('publication unavailable'));
    startScheduledPostsJob();
    await mocks.callback!();
    expect(mocks.revalidate).not.toHaveBeenCalled();
});
