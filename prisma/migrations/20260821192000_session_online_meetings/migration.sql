-- CreateEnum
CREATE TYPE "SessionFormat" AS ENUM ('PHYSICAL', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "OnlineMeetingProvider" AS ENUM ('TEAMS', 'ZOOM');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "format" "SessionFormat" NOT NULL DEFAULT 'PHYSICAL';

-- CreateTable
CREATE TABLE "OnlineMeeting" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "provider" "OnlineMeetingProvider" NOT NULL,
    "providerMeetingId" TEXT,
    "joinUrl" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnlineMeeting_organisationId_eventId_idx" ON "OnlineMeeting"("organisationId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineMeeting_sessionId_provider_key" ON "OnlineMeeting"("sessionId", "provider");

-- AddForeignKey
ALTER TABLE "OnlineMeeting" ADD CONSTRAINT "OnlineMeeting_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineMeeting" ADD CONSTRAINT "OnlineMeeting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineMeeting" ADD CONSTRAINT "OnlineMeeting_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
