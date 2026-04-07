-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CoachReview" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
