import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, getMe, patchMe, verifyEmail, resendVerification, listAddresses, createAddress, updateAddress, deleteAddress } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, loginLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema, patchMeSchema, createAddressSchema, updateAddressSchema } from '@aranya/shared';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
// Email-verification link target. Rate-limited even though tokens are 48 random
// chars (brute-force is infeasible) — defence in depth against token guessing.
router.get('/verify', authLimiter, asyncHandler(verifyEmail));
// Resend the verification link (neutral, anti-enumeration). authLimiter caps abuse.
router.post('/resend-verification', authLimiter, asyncHandler(resendVerification));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.post('/refresh', authLimiter, asyncHandler(refresh));
// Logout needs no access token — possession of the refresh cookie is the proof
router.post('/logout', authLimiter, asyncHandler(logout));
router.post('/logout-all', asyncHandler(requireAuth), asyncHandler(logoutAll));
router.get('/me', asyncHandler(requireAuth), asyncHandler(getMe));
router.patch('/me', asyncHandler(requireAuth), validate(patchMeSchema), asyncHandler(patchMe));

// Addresses
router.get('/me/addresses', asyncHandler(requireAuth), asyncHandler(listAddresses));
router.post('/me/addresses', asyncHandler(requireAuth), validate(createAddressSchema), asyncHandler(createAddress));
router.patch('/me/addresses/:id', asyncHandler(requireAuth), validate(updateAddressSchema), asyncHandler(updateAddress));
router.delete('/me/addresses/:id', asyncHandler(requireAuth), asyncHandler(deleteAddress));

export default router;
