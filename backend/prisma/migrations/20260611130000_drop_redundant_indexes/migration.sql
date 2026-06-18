-- Drop redundant indexes (#25):
--  * User_email_idx — the UNIQUE constraint on email (User_email_key) already
--    provides an index for login lookups.
--  * Variant_productId_idx — fully covered by the composite
--    Variant_productId_market_idx (leftmost-prefix rule).
DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "Variant_productId_idx";
