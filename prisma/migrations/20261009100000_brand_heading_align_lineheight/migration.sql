-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingAlign" TEXT NOT NULL DEFAULT 'center';
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingLineHeight" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingEyebrowUppercase" BOOLEAN NOT NULL DEFAULT true;
