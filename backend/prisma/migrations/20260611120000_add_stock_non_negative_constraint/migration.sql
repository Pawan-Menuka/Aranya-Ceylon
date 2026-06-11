-- Defense-in-depth: a variant's stock must never go negative (#4).
-- The checkout pre-validation and the atomic `stock >= qty` decrement in the
-- payment webhook are the primary guards; this constraint catches any other
-- code path (admin edits, future features, bugs) that would oversell.
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_stock_non_negative"
  CHECK ("stock" >= 0);
