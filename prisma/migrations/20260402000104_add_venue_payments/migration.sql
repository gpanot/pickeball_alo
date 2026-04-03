-- CreateTable
CREATE TABLE "VenuePayment" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "qrImageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenuePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenuePayment_venueId_idx" ON "VenuePayment"("venueId");

-- AddForeignKey
ALTER TABLE "VenuePayment" ADD CONSTRAINT "VenuePayment_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
