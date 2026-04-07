-- AlterTable
ALTER TABLE "Coach"
ADD COLUMN "experienceBand" TEXT,
ADD COLUMN "groupSizes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill existing rows to satisfy non-null array default
UPDATE "Coach" SET "groupSizes" = ARRAY[]::TEXT[] WHERE "groupSizes" IS NULL;

-- Enforce non-null array
ALTER TABLE "Coach"
ALTER COLUMN "groupSizes" SET NOT NULL;
