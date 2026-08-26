-- CreateTable
CREATE TABLE "VenueFloorPlan" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main floor',
    "floorIndex" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT NOT NULL,
    "calibration" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueFloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPoi" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "meetingRoomId" TEXT,
    "sessionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapCheckpoint" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "poiId" TEXT,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "MapCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendeeMapLocation" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "poiId" TEXT,
    "checkpointId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendeeMapLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueFloorPlan_organisationId_eventId_idx" ON "VenueFloorPlan"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "VenueFloorPlan_eventId_publishedAt_idx" ON "VenueFloorPlan"("eventId", "publishedAt");

-- CreateIndex
CREATE INDEX "MapPoi_organisationId_eventId_idx" ON "MapPoi"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "MapPoi_floorPlanId_idx" ON "MapPoi"("floorPlanId");

-- CreateIndex
CREATE INDEX "MapPoi_meetingRoomId_idx" ON "MapPoi"("meetingRoomId");

-- CreateIndex
CREATE INDEX "MapPoi_sessionId_idx" ON "MapPoi"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MapCheckpoint_tokenHash_key" ON "MapCheckpoint"("tokenHash");

-- CreateIndex
CREATE INDEX "MapCheckpoint_organisationId_eventId_idx" ON "MapCheckpoint"("organisationId", "eventId");

-- CreateIndex
CREATE INDEX "MapCheckpoint_floorPlanId_idx" ON "MapCheckpoint"("floorPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendeeMapLocation_attendeeId_key" ON "AttendeeMapLocation"("attendeeId");

-- CreateIndex
CREATE INDEX "AttendeeMapLocation_organisationId_eventId_idx" ON "AttendeeMapLocation"("organisationId", "eventId");

-- AddForeignKey
ALTER TABLE "VenueFloorPlan" ADD CONSTRAINT "VenueFloorPlan_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueFloorPlan" ADD CONSTRAINT "VenueFloorPlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPoi" ADD CONSTRAINT "MapPoi_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPoi" ADD CONSTRAINT "MapPoi_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPoi" ADD CONSTRAINT "MapPoi_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "VenueFloorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPoi" ADD CONSTRAINT "MapPoi_meetingRoomId_fkey" FOREIGN KEY ("meetingRoomId") REFERENCES "MeetingRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPoi" ADD CONSTRAINT "MapPoi_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCheckpoint" ADD CONSTRAINT "MapCheckpoint_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCheckpoint" ADD CONSTRAINT "MapCheckpoint_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCheckpoint" ADD CONSTRAINT "MapCheckpoint_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "VenueFloorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapCheckpoint" ADD CONSTRAINT "MapCheckpoint_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "MapPoi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeMapLocation" ADD CONSTRAINT "AttendeeMapLocation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeMapLocation" ADD CONSTRAINT "AttendeeMapLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeMapLocation" ADD CONSTRAINT "AttendeeMapLocation_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeMapLocation" ADD CONSTRAINT "AttendeeMapLocation_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "VenueFloorPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeMapLocation" ADD CONSTRAINT "AttendeeMapLocation_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "MapPoi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeMapLocation" ADD CONSTRAINT "AttendeeMapLocation_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "MapCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
