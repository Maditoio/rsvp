-- Badge print queue: check-in enqueues; print station marks printed / invalidate re-queues.
CREATE TYPE "BadgeQueueStatus" AS ENUM ('QUEUED', 'PRINTED');

ALTER TABLE "Badge" ADD COLUMN "status" "BadgeQueueStatus" NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "Badge" ADD COLUMN "queuedAt" TIMESTAMP(3);

UPDATE "Badge" SET "status" = 'PRINTED' WHERE "printedAt" IS NOT NULL;
UPDATE "Badge" SET "queuedAt" = COALESCE("printedAt", CURRENT_TIMESTAMP) WHERE "queuedAt" IS NULL AND "printedAt" IS NOT NULL;

CREATE UNIQUE INDEX "Badge_eventId_attendeeId_key" ON "Badge"("eventId", "attendeeId");
CREATE INDEX "Badge_organisationId_eventId_status_queuedAt_idx" ON "Badge"("organisationId", "eventId", "status", "queuedAt");
