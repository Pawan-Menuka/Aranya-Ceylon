-- Drop three indexes that duplicate a UNIQUE constraint's implicit index
-- (same redundancy class as 20260611130000_drop_redundant_indexes). Each of
-- these columns is already @unique, so Postgres created a unique index
-- (*_key) that fully serves the equality lookups — the extra *_idx was pure
-- write-amplification and storage overhead with no query benefit.
--
--   * Token_tokenHash_idx     covered by Token_tokenHash_key
--   * Coupon_code_idx         covered by Coupon_code_key
--   * Newsletter_email_idx    covered by Newsletter_email_key
DROP INDEX IF EXISTS "Token_tokenHash_idx";
DROP INDEX IF EXISTS "Coupon_code_idx";
DROP INDEX IF EXISTS "Newsletter_email_idx";
