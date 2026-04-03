-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "adminPin" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "adminNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT;
