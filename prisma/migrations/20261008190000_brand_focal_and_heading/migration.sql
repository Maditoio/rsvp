-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "emailBannerFocalX" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "EventSettings" ADD COLUMN "emailBannerFocalY" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroFocalX" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroFocalY" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingColor" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingFont" TEXT NOT NULL DEFAULT 'inter';
ALTER TABLE "EventSettings" ADD COLUMN "brandHeadingSize" TEXT NOT NULL DEFAULT 'md';
