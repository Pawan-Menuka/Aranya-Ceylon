import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
const service = vi.hoisted(() => ({ page: vi.fn(), legacy: vi.fn() }));
vi.mock('../../services/admin-page.service.js', () => ({ listAdminPage: service.page }));
vi.mock('./analytics.admin.controller.js', () => ({ getAuditLogs: service.legacy }));
import { listAuditLogs } from './audit-page.controller.js';
beforeEach(() => vi.resetAllMocks());
describe('audit list opt-in paging', () => {
    it('preserves the existing route contract when view is absent', async () => {
        const req = { query: { limit: '100', event: 'ORDER_REFUND' } } as unknown as Request;
        const res = {} as Response;
        await listAuditLogs(req, res);
        expect(service.legacy).toHaveBeenCalledWith(req, res);
        expect(service.page).not.toHaveBeenCalled();
    });
    it('validates bounded page filters and returns global counts through the same protected route', async () => {
        service.page.mockResolvedValueOnce({ items: [], total: 10, counts: { all: 625, warn: 10 }, nextCursor: null, hasNextPage: false });
        const json = vi.fn();
        await listAuditLogs({ query: { view: 'page', filter: 'warn', q: ' refund ', limit: '20' } } as unknown as Request, { json } as unknown as Response);
        expect(service.page).toHaveBeenCalledWith('audit', { view: 'page', filter: 'warn', q: 'refund', limit: 20 });
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ total: 10, counts: { all: 625, warn: 10 } }));
        expect(service.legacy).not.toHaveBeenCalled();
    });
});
