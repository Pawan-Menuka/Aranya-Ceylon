-- The unique constraint "Product_slug_key" already indexes slug; this plain
-- index duplicated it (audit finding #53).
DROP INDEX IF EXISTS "Product_slug_idx";
