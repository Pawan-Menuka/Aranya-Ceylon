-- CreateTable: GiftSet
CREATE TABLE IF NOT EXISTS "GiftSet" (
    "id"        TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "featured"  BOOLEAN NOT NULL DEFAULT false,
    "tagline"   TEXT NOT NULL,
    "blurb"     TEXT NOT NULL,
    "badge"     TEXT,
    "jar"       TEXT NOT NULL DEFAULT '50g',
    "color"     TEXT NOT NULL DEFAULT '#B5651D',
    "base"      TEXT NOT NULL DEFAULT '#C2772E',
    "deep"      TEXT NOT NULL DEFAULT '#7E481A',
    "surface"   TEXT NOT NULL DEFAULT '#F3E7D4',
    "usd"       TEXT NOT NULL,
    "lkr"       TEXT NOT NULL,
    "contents"  TEXT[] NOT NULL,
    "status"    "BlogStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GiftSet_slug_key" ON "GiftSet"("slug");
CREATE INDEX IF NOT EXISTS "GiftSet_status_featured_idx" ON "GiftSet"("status", "featured");
