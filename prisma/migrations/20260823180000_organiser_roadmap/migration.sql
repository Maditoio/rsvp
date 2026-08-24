-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "operationsConfig" JSONB;

-- AlterTable
ALTER TABLE "AttendeePrivacy" ADD COLUMN "matchmakingPaused" BOOLEAN NOT NULL DEFAULT false;
