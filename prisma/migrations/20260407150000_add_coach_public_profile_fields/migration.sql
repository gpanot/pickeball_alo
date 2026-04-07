-- AlterTable
ALTER TABLE "Coach"
ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "focusLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "yearsExperience" INTEGER,
ADD COLUMN "responseHint" TEXT;

-- Backfill existing rows to satisfy non-null array defaults
UPDATE "Coach" SET "languages" = ARRAY[]::TEXT[] WHERE "languages" IS NULL;
UPDATE "Coach" SET "focusLevels" = ARRAY[]::TEXT[] WHERE "focusLevels" IS NULL;

-- Enforce non-null arrays
ALTER TABLE "Coach"
ALTER COLUMN "languages" SET NOT NULL,
ALTER COLUMN "focusLevels" SET NOT NULL;
