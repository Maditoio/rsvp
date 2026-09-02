-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "suspendedAt" TIMESTAMP(3);
