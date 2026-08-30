-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "customDomain" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "customDomainStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "EventSettings" ADD COLUMN "customDomainError" TEXT;
ALTER TABLE "EventSettings" ADD COLUMN "customDomainRequestedAt" TIMESTAMP(3);
ALTER TABLE "EventSettings" ADD COLUMN "customDomainVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "EventSettings_customDomain_key" ON "EventSettings"("customDomain");
