import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, getMe, patchMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, loginLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '@aranya/shared';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.post('/refresh', authLimiter, asyncHandler(refresh));
// Logout needs no access token — possession of the refresh cookie is the proof
router.post('/logout', authLimiter, asyncHandler(logout));
router.post('/logout-all', asyncHandler(requireAuth), asyncHandler(logoutAll));
router.get('/me', asyncHandler(requireAuth), asyncHandler(getMe));
router.patch('/me', asyncHandler(requireAuth), asyncHandler(patchMe));

export default router;
