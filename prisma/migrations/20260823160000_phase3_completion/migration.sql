-- CreateEnum
CREATE TYPE "CommunicationAutomationTrigger" AS ENUM ('INVITATION_NOT_ACCEPTED', 'INVITATION_NOT_REGISTERED', 'MEETING_ACCEPTED', 'EVENT_STARTS_BEFORE');

-- CreateEnum
CREATE TYPE "CommunicationAutomationAction" AS ENUM ('SEND_INVITATION_REMINDER', 'SEND_REGISTRATION_REMINDER', 'SEND_MEETING_CONFIRMATION', 'SEND_EVENT_REMINDER');

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "automationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MatchScore" ADD COLUMN "aiRankScore" DOUBLE PRECISION,
ADD COLUMN "aiRankedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CommunicationAutomation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT,
    "trigger" "CommunicationAutomationTrigger" NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 5,
    "action" "CommunicationAutomationAction" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationAutomation_organisationId_eventId_idx" ON "CommunicationAutomation"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "CommunicationAutomation_eventId_enabled_idx" ON "CommunicationAutomation"("eventId", "enabled");

-- AddForeignKey
ALTER TABLE "CommunicationAutomation" ADD CONSTRAINT "CommunicationAutomation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomation" ADD CONSTRAINT "CommunicationAutomation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
