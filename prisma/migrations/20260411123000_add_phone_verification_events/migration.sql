CREATE TABLE "PhoneVerificationEvent" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneVerificationEvent_subjectType_subjectId_createdAt_idx"
ON "PhoneVerificationEvent"("subjectType", "subjectId", "createdAt");

CREATE INDEX "PhoneVerificationEvent_phone_createdAt_idx"
ON "PhoneVerificationEvent"("phone", "createdAt");
