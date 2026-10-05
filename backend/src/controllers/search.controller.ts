import type { Request, Response } from 'express';
import { publicSearchSchema } from '@aranya/shared';
import { searchPublic } from '../services/search.service.js';

export async function search(req: Request, res: Response) {
    return res.json(await searchPublic(publicSearchSchema.parse(req.query), req.market!));
}
