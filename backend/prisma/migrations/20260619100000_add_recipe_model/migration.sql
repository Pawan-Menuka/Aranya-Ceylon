-- Aranya Ceylon — Recipe model for the Recipes section.
-- Each recipe stores all UI fields so the frontend can render without
-- additional joins. Ingredients, method and tips are stored as JSON arrays.

CREATE TABLE IF NOT EXISTS "Recipe" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "dek"         TEXT NOT NULL,
    "course"      TEXT NOT NULL,
    "accent"      TEXT NOT NULL DEFAULT '#3C3A36',
    "slot"        TEXT NOT NULL DEFAULT '',
    "featured"    BOOLEAN NOT NULL DEFAULT false,
    "prepMins"    INTEGER NOT NULL DEFAULT 0,
    "cookMins"    INTEGER NOT NULL DEFAULT 0,
    "serves"      INTEGER NOT NULL DEFAULT 0,
    "difficulty"  TEXT NOT NULL DEFAULT 'Easy',
    "intro"       TEXT NOT NULL,
    "spices"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ingredients" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "method"      JSONB NOT NULL DEFAULT '[]'::JSONB,
    "tips"        JSONB NOT NULL DEFAULT '[]'::JSONB,
    "status"      "BlogStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Recipe_slug_key" ON "Recipe"("slug");
CREATE INDEX IF NOT EXISTS "Recipe_status_course_idx" ON "Recipe"("status", "course");
