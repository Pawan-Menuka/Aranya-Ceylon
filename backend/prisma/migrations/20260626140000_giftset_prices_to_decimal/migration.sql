-- Convert GiftSet.usd / GiftSet.lkr from formatted strings ("$28.50", "Rs 4,250")
-- to Decimal(10,2), matching how every other price in the schema is stored.
-- The USING clause strips all non-numeric characters (currency symbols, commas,
-- "Rs"/"$") and casts the remainder; COALESCE guards against any empty value so
-- the NOT NULL column is never violated.
ALTER TABLE "GiftSet"
  ALTER COLUMN "usd" TYPE DECIMAL(10,2)
  USING (COALESCE(NULLIF(regexp_replace("usd", '[^0-9.]', '', 'g'), ''), '0'))::DECIMAL(10,2);

ALTER TABLE "GiftSet"
  ALTER COLUMN "lkr" TYPE DECIMAL(10,2)
  USING (COALESCE(NULLIF(regexp_replace("lkr", '[^0-9.]', '', 'g'), ''), '0'))::DECIMAL(10,2);
