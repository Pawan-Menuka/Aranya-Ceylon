-- Account emails are now trimmed and lower-cased on every request that names
-- one (register, sign-in, password reset, verification). Existing rows were
-- stored as typed, so a mixed-case account would no longer be found at
-- sign-in. Normalise them — except where two accounts differ only by case:
-- merging those is a decision for a person, so both are left untouched and
-- can be found with:
--   SELECT lower(trim(email)) AS email, count(*) FROM "User"
--   GROUP BY 1 HAVING count(*) > 1;
UPDATE "User" AS u
SET "email" = lower(trim(u."email"))
WHERE u."email" <> lower(trim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "User" AS o
    WHERE o."id" <> u."id"
      AND lower(trim(o."email")) = lower(trim(u."email"))
  );
