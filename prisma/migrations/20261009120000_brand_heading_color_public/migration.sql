-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingColorPublic" TEXT;

-- Backfill: copy hero colour, but map pure white → dark slate for readable public pages.
UPDATE "EventSettings"
SET "brandHeadingColorPublic" = CASE
  WHEN "brandHeadingColor" IS NULL THEN NULL
  WHEN UPPER("brandHeadingColor") IN ('#FFFFFF', '#FFF') THEN '#0F172A'
  ELSE "brandHeadingColor"
END
WHERE "brandHeadingColorPublic" IS NULL;
