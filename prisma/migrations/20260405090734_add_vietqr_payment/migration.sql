-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "paymentSubmittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VenuePayment" ADD COLUMN     "bankBin" TEXT,
ADD COLUMN     "isDefaultForDynamicQr" BOOLEAN NOT NULL DEFAULT false;
