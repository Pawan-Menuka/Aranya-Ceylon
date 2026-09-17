-- CartItem FK indexes (perf audit #11, PERF-02 follow-up). IF NOT EXISTS so
-- this is safe to re-run / apply out of band, same as add_perf_indexes.
--
-- @@unique([cartId, variantId]) only serves lookups led by cartId.
-- tx.cartItem.count({ where: { variantId } }) in product.service.ts (checking
-- a variant isn't sitting in any live cart before it's archived) filters by
-- variantId alone and had no index to use at all.
CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId");
CREATE INDEX IF NOT EXISTS "CartItem_variantId_idx" ON "CartItem"("variantId");
