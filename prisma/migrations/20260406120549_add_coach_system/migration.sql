-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "photo" TEXT,
    "bio" TEXT,
    "certifications" TEXT[],
    "specialties" TEXT[],
    "ratingOverall" DOUBLE PRECISION,
    "ratingOnTime" DOUBLE PRECISION,
    "ratingFriendly" DOUBLE PRECISION,
    "ratingProfessional" DOUBLE PRECISION,
    "ratingRecommend" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionExpires" TIMESTAMP(3),
    "trialBookingsUsed" INTEGER NOT NULL DEFAULT 0,
    "hourlyRate1on1" INTEGER NOT NULL,
    "hourlyRateGroup" INTEGER,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 4,
    "cancellationHours" INTEGER NOT NULL DEFAULT 24,
    "creditExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankBin" TEXT,
    "paymentFlagCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachCourtLink" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "courtIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CoachCourtLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachAvailability" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "date" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CoachAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "courtName" TEXT,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "coachFee" INTEGER NOT NULL,
    "courtFee" INTEGER NOT NULL,
    "totalPerPlayer" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentFlaggedAt" TIMESTAMP(3),
    "slotIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentProofUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "creditId" TEXT,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPack" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creditCount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "discountPercent" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "creditPackId" TEXT,
    "totalCredits" INTEGER NOT NULL,
    "remainingCredits" INTEGER NOT NULL,
    "pricePerCredit" INTEGER NOT NULL,
    "totalPaid" INTEGER NOT NULL,
    "paymentProofUrl" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachReview" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "ratingOnTime" INTEGER NOT NULL,
    "ratingFriendly" INTEGER NOT NULL,
    "ratingProfessional" INTEGER NOT NULL,
    "ratingRecommend" INTEGER NOT NULL,
    "ratingOverall" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachVenueInvite" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CoachVenueInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_phone_key" ON "Coach"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_email_key" ON "Coach"("email");

-- CreateIndex
CREATE INDEX "CoachCourtLink_coachId_idx" ON "CoachCourtLink"("coachId");

-- CreateIndex
CREATE INDEX "CoachCourtLink_venueId_idx" ON "CoachCourtLink"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachCourtLink_coachId_venueId_key" ON "CoachCourtLink"("coachId", "venueId");

-- CreateIndex
CREATE INDEX "CoachAvailability_coachId_idx" ON "CoachAvailability"("coachId");

-- CreateIndex
CREATE INDEX "CoachAvailability_coachId_dayOfWeek_idx" ON "CoachAvailability"("coachId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "CoachAvailability_coachId_date_idx" ON "CoachAvailability"("coachId", "date");

-- CreateIndex
CREATE INDEX "CoachSession_coachId_idx" ON "CoachSession"("coachId");

-- CreateIndex
CREATE INDEX "CoachSession_coachId_date_idx" ON "CoachSession"("coachId", "date");

-- CreateIndex
CREATE INDEX "CoachSession_venueId_idx" ON "CoachSession"("venueId");

-- CreateIndex
CREATE INDEX "SessionParticipant_sessionId_idx" ON "SessionParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "SessionParticipant_userId_idx" ON "SessionParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_userId_key" ON "SessionParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "CreditPack_coachId_idx" ON "CreditPack"("coachId");

-- CreateIndex
CREATE INDEX "Credit_coachId_userId_idx" ON "Credit"("coachId", "userId");

-- CreateIndex
CREATE INDEX "Credit_userId_idx" ON "Credit"("userId");

-- CreateIndex
CREATE INDEX "CoachReview_coachId_idx" ON "CoachReview"("coachId");

-- CreateIndex
CREATE INDEX "CoachReview_userId_idx" ON "CoachReview"("userId");

-- CreateIndex
CREATE INDEX "CoachVenueInvite_coachId_idx" ON "CoachVenueInvite"("coachId");

-- CreateIndex
CREATE INDEX "CoachVenueInvite_venueId_idx" ON "CoachVenueInvite"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachVenueInvite_coachId_venueId_key" ON "CoachVenueInvite"("coachId", "venueId");

-- AddForeignKey
ALTER TABLE "CoachCourtLink" ADD CONSTRAINT "CoachCourtLink_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachCourtLink" ADD CONSTRAINT "CoachCourtLink_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAvailability" ADD CONSTRAINT "CoachAvailability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSession" ADD CONSTRAINT "CoachSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPack" ADD CONSTRAINT "CreditPack_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReview" ADD CONSTRAINT "CoachReview_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachVenueInvite" ADD CONSTRAINT "CoachVenueInvite_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
