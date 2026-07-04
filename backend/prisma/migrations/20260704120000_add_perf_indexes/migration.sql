-- Performance indexes (PERF-01 / PERF-02).
-- All are IF NOT EXISTS so this is safe to re-run / apply out of band.

-- PERF-01: the FTS GIN index was created in add_fts_and_constraints and then
-- dropped by first_migration, never recreated — every searchVector @@ query has
-- been a sequential scan since. Recreate it, plus a trigram index on name to
-- keep the "% similarity" autocomplete off a seq scan too.
CREATE INDEX IF NOT EXISTS "Product_searchVector_idx"
  ON "Product" USING GIN ("searchVector");

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx"
  ON "Product" USING GIN ("name" gin_trgm_ops);

-- PERF-02: Postgres does not auto-index foreign-key columns. Index the hot join
-- columns so order/product includes and the dashboard groupBy don't scan the
-- child tables as data grows.
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx"     ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx"   ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx"   ON "OrderItem"("variantId");
CREATE INDEX IF NOT EXISTS "OrderEvent_orderId_idx"    ON "OrderEvent"("orderId");
CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");
CREATE INDEX IF NOT EXISTS "Order_couponId_idx"        ON "Order"("couponId");
