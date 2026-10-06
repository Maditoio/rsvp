-- CreateEnum
CREATE TYPE "EmailHeroBackgroundMode" AS ENUM ('IMAGE', 'COLOR', 'GRADIENT');

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroBackgroundMode" "EmailHeroBackgroundMode" NOT NULL DEFAULT 'COLOR';
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroGradientStyle" TEXT;
