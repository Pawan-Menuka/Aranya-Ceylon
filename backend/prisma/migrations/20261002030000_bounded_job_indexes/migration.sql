-- Additive access paths for bounded background-job batches.
CREATE INDEX "Blog_status_scheduledAt_id_idx" ON "Blog" ("status", "scheduledAt", "id");
CREATE INDEX "Cart_userId_expiresAt_id_idx" ON "Cart" ("userId", "expiresAt", "id");
CREATE INDEX "Cart_abandonedEmailSentAt_updatedAt_id_idx" ON "Cart" ("abandonedEmailSentAt", "updatedAt", "id");
CREATE INDEX "Token_expiresAt_id_idx" ON "Token" ("expiresAt", "id");
CREATE INDEX "Order_status_createdAt_id_idx" ON "Order" ("status", "createdAt", "id");
CREATE INDEX "Variant_stock_id_idx" ON "Variant" ("stock", "id");
