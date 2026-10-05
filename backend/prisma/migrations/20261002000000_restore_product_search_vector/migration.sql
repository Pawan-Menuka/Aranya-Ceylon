-- Observed drift: the live index exists but its trigger is absent and all
-- current active products have NULL vectors. Reviewed release migration only.
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
  BEFORE INSERT OR UPDATE OF name, description ON "Product"
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();
UPDATE "Product" SET "searchVector" =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE "searchVector" IS DISTINCT FROM (
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B'));
