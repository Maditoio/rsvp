-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroOverlayEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroEyebrow" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroTitle" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroDetail" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroClosing" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroImageUrl" TEXT;
