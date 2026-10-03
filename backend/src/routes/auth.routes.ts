import { Router } from 'express';
import { register, login, refresh, logout, logoutAll, getMe, patchMe, verifyEmail, resendVerification, forgotPassword, resetPassword, listAddresses, createAddress, updateAddress, deleteAddress } from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middleware/authenticate.js';
import * as twoFactor from '../controllers/two-factor.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, loginLimiter, refreshLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema, patchMeSchema, createAddressSchema, updateAddressSchema, forgotPasswordSchema, resetPasswordSchema, twoFactorEnableSchema, twoFactorDisableSchema } from '@aranya/shared';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
// Email-verification link target. Rate-limited even though tokens are 48 random
// chars (brute-force is infeasible) — defence in depth against token guessing.
router.get('/verify', authLimiter, asyncHandler(verifyEmail));
// Resend the verification link (neutral, anti-enumeration). authLimiter caps abuse.
router.post('/resend-verification', authLimiter, asyncHandler(resendVerification));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
// Neutral (anti-enumeration), same reasoning as resend-verification.
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(resetPassword));
router.post('/refresh', refreshLimiter, asyncHandler(refresh));
// Logout needs no access token — possession of the refresh cookie is the proof
router.post('/logout', authLimiter, asyncHandler(logout));
router.post('/logout-all', asyncHandler(requireAuth), asyncHandler(logoutAll));
router.get('/me', asyncHandler(requireAuth), asyncHandler(getMe));
router.patch('/me', asyncHandler(requireAuth), validate(patchMeSchema), asyncHandler(patchMe));

// Two-factor sign-in for admin accounts. The verify steps are guessing surfaces,
// so they share the strict login budget; setup only mints a secret.
const adminOnly = [asyncHandler(requireAuth), requireRole('ADMIN', 'SUPERADMIN')];
router.post('/2fa/setup', authLimiter, ...adminOnly, asyncHandler(twoFactor.setup));
router.post('/2fa/enable', loginLimiter, ...adminOnly, validate(twoFactorEnableSchema), asyncHandler(twoFactor.enable));
router.post('/2fa/disable', loginLimiter, ...adminOnly, validate(twoFactorDisableSchema), asyncHandler(twoFactor.disable));

// Addresses
router.get('/me/addresses', asyncHandler(requireAuth), asyncHandler(listAddresses));
router.post('/me/addresses', asyncHandler(requireAuth), validate(createAddressSchema), asyncHandler(createAddress));
router.patch('/me/addresses/:id', asyncHandler(requireAuth), validate(updateAddressSchema), asyncHandler(updateAddress));
router.delete('/me/addresses/:id', asyncHandler(requireAuth), asyncHandler(deleteAddress));

export default router;
