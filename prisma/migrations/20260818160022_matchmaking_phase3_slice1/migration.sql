-- AlterTable
ALTER TABLE "AttendeePrivacy" ADD COLUMN     "aiInsightsOptIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "aiInsightsEnabled" BOOLEAN NOT NULL DEFAULT false;
