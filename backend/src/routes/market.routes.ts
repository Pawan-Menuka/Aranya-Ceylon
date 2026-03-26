import { Router } from 'express';
import { SignJWT } from 'jose';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
const COOKIE_SECRET = new TextEncoder().encode(process.env.COOKIE_SECRET!);

router.post('/override', asyncHandler(async (req, res) => {
    const { market } = req.body;

    if (!['local', 'international'].includes(market)) {
        return res.status(400).json({ error: 'Invalid market value' });
    }

    const token = await new SignJWT({ market })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(COOKIE_SECRET);

    res.cookie('x-market', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ market });
}));

export default router;