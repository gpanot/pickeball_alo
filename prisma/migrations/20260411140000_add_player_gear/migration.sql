-- CreateTable
CREATE TABLE "player_gear" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cap" TEXT,
    "shirt" TEXT,
    "paddle" TEXT,
    "shoes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_gear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_gear_playerId_key" ON "player_gear"("playerId");

-- AddForeignKey
ALTER TABLE "player_gear" ADD CONSTRAINT "player_gear_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
