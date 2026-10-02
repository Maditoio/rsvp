-- CreateEnum
CREATE TYPE "SessionRegistrationMode" AS ENUM ('OPEN', 'REQUIRED', 'CLOSED');

-- AlterTable
ALTER TABLE "Session"
ADD COLUMN "registrationMode" "SessionRegistrationMode" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "SessionSpeaker" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SessionSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionSpeaker_sessionId_speakerId_key" ON "SessionSpeaker"("sessionId", "speakerId");

-- CreateIndex
CREATE INDEX "SessionSpeaker_organisationId_eventId_idx" ON "SessionSpeaker"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "SessionSpeaker_sessionId_sortOrder_idx" ON "SessionSpeaker"("sessionId", "sortOrder");

-- CreateIndex
CREATE INDEX "SessionSpeaker_speakerId_idx" ON "SessionSpeaker"("speakerId");

-- AddForeignKey
ALTER TABLE "SessionSpeaker" ADD CONSTRAINT "SessionSpeaker_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSpeaker" ADD CONSTRAINT "SessionSpeaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSpeaker" ADD CONSTRAINT "SessionSpeaker_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSpeaker" ADD CONSTRAINT "SessionSpeaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "EventSpeaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
