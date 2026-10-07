-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "emailBannerMode" "EmailHeroBackgroundMode" NOT NULL DEFAULT 'COLOR';
ALTER TABLE "EventSettings" ADD COLUMN "emailBannerGradientStyle" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "emailBannerBlur" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroBlur" INTEGER NOT NULL DEFAULT 6;

-- Existing photo banners should keep IMAGE mode on public pages.
UPDATE "EventSettings" SET "emailBannerMode" = 'IMAGE' WHERE "emailBannerUrl" IS NOT NULL;
