import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const resource = () => ({ findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() });
    return { blog: resource(), recipe: resource(), revalidate: vi.fn(), audit: vi.fn() };
});
vi.mock('../../lib/prisma.js', () => ({ prisma: { blog: mocks.blog, recipe: mocks.recipe } }));
vi.mock('../../lib/revalidate.js', () => ({ revalidateFrontend: mocks.revalidate }));
vi.mock('../../services/audit.service.js', () => ({ writeAuditLog: mocks.audit }));
import { createBlog, deleteBlog, updateBlog } from './blog.admin.controller.js';
import { createRecipe, deleteRecipe, updateRecipe } from './recipe.admin.controller.js';

function response(): Response {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res); res.json.mockReturnValue(res);
    return res as unknown as Response;
}
function req(body: unknown): Request {
    return { params: { id: 'record-1' }, body, user: { userId: 'admin-fixture' } } as unknown as Request;
}
const cases = [
    { name: 'blog', path: '/journal', extra: ['/', '/search'], store: mocks.blog, create: createBlog, update: updateBlog, remove: deleteBlog, fields: { title: 'Fixture story', content: 'A sufficiently long fixture story.' } },
    { name: 'recipe', path: '/recipes', extra: ['/search'], store: mocks.recipe, create: createRecipe, update: updateRecipe, remove: deleteRecipe, fields: { title: 'Fixture recipe', dek: 'Fixture recipe description', course: 'Dinner' } },
];

beforeEach(() => {
    vi.resetAllMocks();
    for (const entry of cases) {
        const old = { id: 'record-1', slug: 'old-slug', status: 'PUBLISHED', publishedAt: new Date(), ...entry.fields };
        entry.store.findUnique.mockResolvedValue(old);
        entry.store.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...old, ...data }));
        entry.store.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...old, ...data }));
    }
});

it.each(cases)('$name invalidates the old and new URLs on rename and unpublish', async entry => {
    await entry.update(req({ slug: 'new-slug', status: 'DRAFT' }), response());
    expect(mocks.revalidate).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).toHaveBeenCalledWith(expect.arrayContaining([entry.path, ...entry.extra, `${entry.path}/old-slug`, `${entry.path}/new-slug`]));
    expect(entry.store.update.mock.invocationCallOrder[0]).toBeLessThan(mocks.revalidate.mock.invocationCallOrder[0]!);
});

it.each(cases)('$name invalidates a previously cached missing detail on publication', async entry => {
    await entry.create(req({ ...entry.fields, slug: 'new-slug', status: 'PUBLISHED' }), response());
    expect(mocks.revalidate).toHaveBeenCalledWith(expect.arrayContaining([entry.path, ...entry.extra, `${entry.path}/new-slug`]));
});

it.each(cases)('$name invalidates listing, detail and search dependencies on deletion', async entry => {
    await entry.remove(req({}), response());
    expect(entry.store.delete).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).toHaveBeenCalledWith(expect.arrayContaining([entry.path, ...entry.extra, `${entry.path}/old-slug`]));
});

it.each(cases)('$name does not invalidate public views when creating a draft or updating a missing record', async entry => {
    await entry.create(req({ ...entry.fields, slug: 'new-slug', status: 'DRAFT' }), response());
    entry.store.findUnique.mockResolvedValue(null);
    await entry.update(req({ slug: 'new-slug' }), response());
    expect(mocks.revalidate).not.toHaveBeenCalled();
});

it.each(cases.flatMap(entry => ['create', 'update', 'delete'].map(operation => ({ ...entry, operation }))))('$name $operation invalidates committed changes despite audit failure and preserves the error', async entry => {
    const failure = new Error('audit unavailable');
    mocks.audit.mockRejectedValue(failure);
    const work = entry.operation === 'create'
        ? entry.create(req({ ...entry.fields, slug: 'new-slug', status: 'PUBLISHED' }), response())
        : entry.operation === 'update' ? entry.update(req({ slug: 'new-slug', status: 'DRAFT' }), response())
        : entry.remove(req({}), response());
    await expect(work).rejects.toBe(failure);
    expect(mocks.revalidate).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).toHaveBeenCalledWith(expect.arrayContaining([entry.path, ...entry.extra, `${entry.path}/${entry.operation === 'delete' ? 'old-slug' : 'new-slug'}`]));
});
