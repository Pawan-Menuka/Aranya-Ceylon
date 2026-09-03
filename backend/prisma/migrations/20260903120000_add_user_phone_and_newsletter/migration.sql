-- Wave-fix (remaining-surfaces audit #14, #15): the account Profile page's
-- "Phone" field and "Harvest List" newsletter toggle were both decorative —
-- no backing column existed, so edits were silently discarded. Add real
-- columns so PATCH /auth/me can persist them.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "newsletterOptIn" BOOLEAN NOT NULL DEFAULT true;
