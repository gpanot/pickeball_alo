-- Structured pricing (CourtMap_Courts_Pricing_Spec): relational tables + slot uniqueness

CREATE TABLE "PricingTable" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayTypes" TEXT[],
    "rows" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DateOverride" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dayType" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "DateOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Venue" ADD COLUMN "hasMemberPricing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimeSlot" ADD COLUMN "memberPrice" INTEGER;

-- Remove duplicate slots before unique constraint
DELETE FROM "TimeSlot" a
WHERE EXISTS (
    SELECT 1 FROM "TimeSlot" b
    WHERE b."courtId" = a."courtId"
      AND b.date = a.date
      AND b.time = a.time
      AND b.id < a.id
);

CREATE UNIQUE INDEX "TimeSlot_courtId_date_time_key" ON "TimeSlot"("courtId", "date", "time");

CREATE UNIQUE INDEX "DateOverride_venueId_date_key" ON "DateOverride"("venueId", "date");

ALTER TABLE "PricingTable" ADD CONSTRAINT "PricingTable_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DateOverride" ADD CONSTRAINT "DateOverride_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PricingTable_venueId_idx" ON "PricingTable"("venueId");
CREATE INDEX "DateOverride_venueId_idx" ON "DateOverride"("venueId");

-- Default pricing band per venue (re-seed or admin can edit)
INSERT INTO "PricingTable" ("id", "venueId", "name", "dayTypes", "rows", "sortOrder", "createdAt", "updatedAt")
SELECT
    'cm_seed_pt_' || "id",
    "id",
    'Standard',
    ARRAY['weekday', 'weekend']::TEXT[],
    jsonb_build_array(
        jsonb_build_object(
            'startTime', '05:00',
            'endTime', '23:30',
            'walkIn', COALESCE("priceMin", 80000),
            'member', NULL::int
        )
    ),
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Venue";

ALTER TABLE "Venue" DROP COLUMN IF EXISTS "pricingTables";
