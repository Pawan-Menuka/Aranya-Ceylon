-- Wave-fix (remaining-surfaces audit #10): the catalog's "Flavour" filter had
-- no backing field — every real product returned an empty flavour list, so
-- the filter silently matched nothing. Add a real column the admin can tag.
ALTER TABLE "Product" ADD COLUMN "flavour" TEXT[] NOT NULL DEFAULT '{}';
