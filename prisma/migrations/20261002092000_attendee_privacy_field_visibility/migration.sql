-- Field-level peer visibility for AttendeePrivacy (§18).
-- When profileVisible is true, public profile fields default on; email/phone stay behind showEmail/showPhone.

ALTER TABLE "AttendeePrivacy" ADD COLUMN "visibility" JSONB;

UPDATE "AttendeePrivacy"
SET "visibility" = jsonb_build_object(
  'name', "profileVisible",
  'jobTitle', "profileVisible",
  'company', "profileVisible",
  'country', "profileVisible",
  'photo', "profileVisible",
  'about', "profileVisible",
  'interests', "profileVisible",
  'lookingFor', "profileVisible",
  'offering', "profileVisible",
  'website', "profileVisible",
  'linkedin', "profileVisible",
  'industry', "profileVisible",
  'email', "showEmail",
  'phone', "showPhone"
)
WHERE "visibility" IS NULL;
