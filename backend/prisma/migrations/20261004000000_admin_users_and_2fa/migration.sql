-- Admin user management and two-factor sign-in (final audit #43).
--   suspendedAt            : set by a SUPERADMIN; blocks sign-in and session renewal.
--   twoFactorRecoveryCodes : SHA-256 of each unused one-time recovery code.
--   twoFactorLastStep      : time step of the last accepted TOTP code (replay guard).
-- twoFactorEnabled / twoFactorSecret already exist and were unused until now.
ALTER TABLE "User"
    ADD COLUMN "suspendedAt" TIMESTAMP(3),
    ADD COLUMN "twoFactorRecoveryCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "twoFactorLastStep" INTEGER;
