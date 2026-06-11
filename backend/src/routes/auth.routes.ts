import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '@aranya/shared';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/refresh', asyncHandler(refresh));
// Logout needs no access token — possession of the refresh cookie is the proof
router.post('/logout', asyncHandler(logout));
router.post('/logout-all', asyncHandler(requireAuth), asyncHandler(logoutAll));
router.get('/me', asyncHandler(requireAuth), asyncHandler(getMe));

export default router;
