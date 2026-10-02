import type { Request, Response } from 'express';
import { adminAuditPageSchema } from '@aranya/shared';
import { listAdminPage } from '../../services/admin-page.service.js';
import { getAuditLogs } from './analytics.admin.controller.js';

export async function listAuditLogs(req: Request, res: Response) {
    if (req.query.view === 'page') return res.json(await listAdminPage('audit', adminAuditPageSchema.parse(req.query)));
    return getAuditLogs(req, res);
}
