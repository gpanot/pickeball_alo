-- AlterTable
ALTER TABLE "Coach" ALTER COLUMN "languages" DROP DEFAULT,
ALTER COLUMN "focusLevels" DROP DEFAULT,
ALTER COLUMN "groupSizes" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CoachAvailability" ALTER COLUMN "venueId" DROP NOT NULL;
