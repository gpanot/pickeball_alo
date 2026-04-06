-- AloBo integration: venue slug + court id for slot overlay API
-- IF NOT EXISTS: safe when a DB was previously synced with `db push` or manual DDL
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "aloboSlug" TEXT;
ALTER TABLE "Court" ADD COLUMN IF NOT EXISTS "aloboId" TEXT;
