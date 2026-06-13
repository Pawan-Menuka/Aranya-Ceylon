-- Link an order to the cart it was created from, so payment confirmation can
-- clear the cart for guests too (not just authenticated users).
-- IF NOT EXISTS keeps it safe if the column was applied out-of-band.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cartId" TEXT;
