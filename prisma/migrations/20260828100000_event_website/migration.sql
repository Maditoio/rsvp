-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN "websiteConfig" JSONB;
ALTER TABLE "EventSettings" ADD COLUMN "websitePublishedAt" TIMESTAMP(3);
