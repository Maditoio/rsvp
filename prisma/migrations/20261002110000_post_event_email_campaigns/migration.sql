-- CreateEnum
CREATE TYPE "EmailCampaignKind" AS ENUM ('REMINDER', 'POST_EVENT');

-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "PostEventAudience" AS ENUM ('CHECKED_IN', 'REGISTERED', 'REGISTERED_NOT_CHECKED_IN');

-- AlterTable
ALTER TABLE "EmailCampaign"
ADD COLUMN "kind" "EmailCampaignKind" NOT NULL DEFAULT 'REMINDER',
ADD COLUMN "status" "EmailCampaignStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN "subject" TEXT,
ADD COLUMN "body" TEXT,
ADD COLUMN "audience" "PostEventAudience",
ADD COLUMN "categoryIds" JSONB,
ADD COLUMN "queuedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "skippedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "EmailCampaign_organisationId_eventId_kind_createdAt_idx" ON "EmailCampaign"("organisationId", "eventId", "kind", "createdAt");
