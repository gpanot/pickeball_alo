-- Coach profile lock: prevents coach from toggling public back on
ALTER TABLE "Coach" ADD COLUMN "isProfileLocked" BOOLEAN NOT NULL DEFAULT false;

-- Review timing & flagging
ALTER TABLE "CoachReview" ADD COLUMN "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CoachReview" ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CoachReview" ADD COLUMN "flagReason" TEXT;
