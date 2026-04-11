-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "editHistory" JSONB,
ADD COLUMN "supplementaryProofs" JSONB;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "zaloId" TEXT;
