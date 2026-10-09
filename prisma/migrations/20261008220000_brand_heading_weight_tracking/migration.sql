-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingWeight" TEXT NOT NULL DEFAULT 'bold';
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingTracking" TEXT NOT NULL DEFAULT 'normal';

-- Normalize legacy font aliases
UPDATE "EventSettings" SET "brandHeadingFont" = 'source-serif' WHERE "brandHeadingFont" = 'serif';
UPDATE "EventSettings" SET "brandHeadingFont" = 'dm-sans' WHERE "brandHeadingFont" = 'modern';
