-- Badge credentials (printed badge QR) separate from Attendee desk check-in QR.
-- Reprinting revokes the previous credential so old badges fail at entrance scan.

CREATE TYPE "BadgeCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "BadgeAccessResult" AS ENUM ('ALLOWED', 'DENIED');
CREATE TYPE "BadgeAccessDenyReason" AS ENUM ('REVOKED', 'NOT_FOUND', 'NOT_CHECKED_IN');

CREATE TABLE "BadgeCredential" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenEnc" TEXT NOT NULL,
    "status" "BadgeCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "printNumber" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "replacedById" TEXT,
    "issuedByUserId" TEXT,

    CONSTRAINT "BadgeCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BadgeAccessScan" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attendeeId" TEXT,
    "credentialId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedByUserId" TEXT,
    "result" "BadgeAccessResult" NOT NULL,
    "denyReason" "BadgeAccessDenyReason",
    "presentedHash" TEXT,

    CONSTRAINT "BadgeAccessScan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BadgeCredential_tokenHash_key" ON "BadgeCredential"("tokenHash");
CREATE INDEX "BadgeCredential_organisationId_eventId_attendeeId_idx" ON "BadgeCredential"("organisationId", "eventId", "attendeeId");
CREATE INDEX "BadgeCredential_eventId_status_idx" ON "BadgeCredential"("eventId", "status");
CREATE INDEX "BadgeCredential_attendeeId_status_idx" ON "BadgeCredential"("attendeeId", "status");

CREATE INDEX "BadgeAccessScan_organisationId_eventId_scannedAt_idx" ON "BadgeAccessScan"("organisationId", "eventId", "scannedAt");
CREATE INDEX "BadgeAccessScan_eventId_attendeeId_scannedAt_idx" ON "BadgeAccessScan"("eventId", "attendeeId", "scannedAt");

ALTER TABLE "BadgeCredential" ADD CONSTRAINT "BadgeCredential_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BadgeCredential" ADD CONSTRAINT "BadgeCredential_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BadgeCredential" ADD CONSTRAINT "BadgeCredential_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BadgeAccessScan" ADD CONSTRAINT "BadgeAccessScan_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BadgeAccessScan" ADD CONSTRAINT "BadgeAccessScan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BadgeAccessScan" ADD CONSTRAINT "BadgeAccessScan_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BadgeAccessScan" ADD CONSTRAINT "BadgeAccessScan_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "BadgeCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
