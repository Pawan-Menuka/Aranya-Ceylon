-- Additive only: empty rollups fall back to the existing aggregate queries.
-- Backfill runs in bounded worker transactions; no blocking data scan here.
CREATE TABLE "DashboardRollupDay" (
  "day" DATE PRIMARY KEY,
  "revision" BIGINT NOT NULL DEFAULT 1,
  "builtRevision" BIGINT NOT NULL DEFAULT 0,
  "builtAt" TIMESTAMP(3)
);
CREATE TABLE "DashboardDailyOrder" (
  "day" DATE NOT NULL,
  "market" "Market" NOT NULL,
  "currency" "Currency" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "orders" INTEGER NOT NULL,
  "total" DECIMAL(38,2) NOT NULL,
  PRIMARY KEY ("day", "market", "currency", "status")
);
CREATE TABLE "DashboardDailyProduct" (
  "day" DATE NOT NULL,
  "productId" TEXT NOT NULL,
  "market" "Market" NOT NULL,
  "currency" "Currency" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "units" BIGINT NOT NULL,
  "revenue" DECIMAL(38,2) NOT NULL,
  PRIMARY KEY ("day", "productId", "market", "currency", "status")
);
CREATE FUNCTION mark_dashboard_rollup_days(dates DATE[]) RETURNS void AS $$
DECLARE report_day DATE;
BEGIN
  -- Consistent lock order also covers the rare move between order creation days.
  FOR report_day IN SELECT DISTINCT d FROM unnest(dates) d WHERE d IS NOT NULL ORDER BY d LOOP
    INSERT INTO "DashboardRollupDay" ("day") VALUES (report_day)
    ON CONFLICT ("day") DO UPDATE SET "revision" = "DashboardRollupDay"."revision" + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
CREATE FUNCTION dirty_dashboard_order() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM mark_dashboard_rollup_days(ARRAY[NEW."createdAt"::date]);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM mark_dashboard_rollup_days(ARRAY[OLD."createdAt"::date]);
  ELSE
    PERFORM mark_dashboard_rollup_days(ARRAY[OLD."createdAt"::date, NEW."createdAt"::date]);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER dashboard_order_dirty
AFTER INSERT OR DELETE OR UPDATE OF "createdAt", market, currency, status, total ON "Order"
FOR EACH ROW EXECUTE FUNCTION dirty_dashboard_order();
CREATE FUNCTION dirty_dashboard_item() RETURNS trigger AS $$
DECLARE previous_day DATE; next_day DATE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "createdAt"::date INTO previous_day FROM "Order" WHERE id = OLD."orderId";
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT "createdAt"::date INTO next_day FROM "Order" WHERE id = NEW."orderId";
  END IF;
  PERFORM mark_dashboard_rollup_days(ARRAY[previous_day, next_day]);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER dashboard_item_dirty
AFTER INSERT OR DELETE OR UPDATE OF "orderId", "productId", quantity, "unitPrice" ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION dirty_dashboard_item();
