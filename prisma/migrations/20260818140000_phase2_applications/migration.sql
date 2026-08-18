-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "jobTitle" TEXT,
    "country" TEXT,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "invitationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_eventId_email_key" ON "EventApplication"("eventId", "email");

-- CreateIndex
CREATE INDEX "EventApplication_organisationId_eventId_status_idx" ON "EventApplication"("organisationId", "eventId", "status");

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
CREATE UNIQUE INDEX "RegistrationForm_eventId_key" ON "RegistrationForm"("eventId");

-- AlterTable
CREATE UNIQUE INDEX "RegistrationField_formId_key_key" ON "RegistrationField"("formId", "key");
