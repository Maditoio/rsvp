-- Source photo for invitation hero IMAGE mode (separate from public page banner).
ALTER TABLE "EventSettings" ADD COLUMN "emailHeroPhotoUrl" TEXT;

-- Existing events shared one upload for both surfaces; copy banner into hero photo so both keep working.
UPDATE "EventSettings"
SET "emailHeroPhotoUrl" = "emailBannerUrl"
WHERE "emailBannerUrl" IS NOT NULL;
