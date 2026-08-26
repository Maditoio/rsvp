-- CreateTable
CREATE TABLE "MapAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "floorPlanId" TEXT,
    "poiId" TEXT,
    "checkpointId" TEXT,
    "query" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapAnalyticsEvent_organisationId_eventId_kind_createdAt_idx" ON "MapAnalyticsEvent"("organisationId", "eventId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "MapAnalyticsEvent_poiId_idx" ON "MapAnalyticsEvent"("poiId");

-- CreateIndex
CREATE INDEX "MapAnalyticsEvent_floorPlanId_idx" ON "MapAnalyticsEvent"("floorPlanId");

-- CreateIndex
CREATE INDEX "MapAnalyticsEvent_eventId_createdAt_idx" ON "MapAnalyticsEvent"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "VenueFloorPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "MapPoi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapAnalyticsEvent" ADD CONSTRAINT "MapAnalyticsEvent_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "MapCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
