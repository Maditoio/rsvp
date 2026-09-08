-- CreateEnum
CREATE TYPE "SessionMeetingPolicy" AS ENUM ('BLOCK_REGISTERED', 'BLOCK_ALL', 'MEETING_WINDOW');

-- AlterTable
ALTER TABLE "Session"
ADD COLUMN "meetingPolicy" "SessionMeetingPolicy" NOT NULL DEFAULT 'BLOCK_REGISTERED';
