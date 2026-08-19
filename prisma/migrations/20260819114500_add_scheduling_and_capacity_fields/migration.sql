-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "meetingDurationMinutes" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "eventStartTime" TEXT NOT NULL DEFAULT '09:00';

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "eventEndTime" TEXT NOT NULL DEFAULT '18:00';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "capacity" INTEGER;

-- AlterTable
ALTER TABLE "MatchScore" ADD COLUMN     "aiInsight" TEXT;
