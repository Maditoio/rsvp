-- Event badge printing: settings config + print audit
ALTER TABLE "EventSettings" ADD COLUMN "badgeConfig" JSONB;

ALTER TABLE "Badge" ADD COLUMN "printedByUserId" TEXT;
