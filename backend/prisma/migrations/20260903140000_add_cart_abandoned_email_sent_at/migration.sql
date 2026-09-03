-- Roadmap: abandoned-cart recovery emails. Tracks whether a recovery email
-- has already gone out for the current period of inactivity, so the cron
-- job doesn't resend on every hourly pass.
ALTER TABLE "Cart" ADD COLUMN "abandonedEmailSentAt" TIMESTAMP(3);
