-- Add tsvector column for full-text search on products
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- GIN index makes tsvector queries fast (required for FTS performance)
CREATE INDEX IF NOT EXISTS "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Trigger: auto-update searchVector when name or description changes
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER product_search_vector_update
  BEFORE INSERT OR UPDATE ON "Product"
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- pg_trgm extension for fuzzy/autocomplete search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CHECK constraint: review rating must be 1–5
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check"
  CHECK (rating >= 1 AND rating <= 5);

-- Prevent DELETE on audit_logs at DB level (defense-in-depth)
REVOKE DELETE ON "AuditLog" FROM PUBLIC;