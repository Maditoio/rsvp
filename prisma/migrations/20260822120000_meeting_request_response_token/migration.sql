-- AlterTable
ALTER TABLE "MeetingRequest" ADD COLUMN "responseTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRequest_responseTokenHash_key" ON "MeetingRequest"("responseTokenHash");
