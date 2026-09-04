-- AlterTable
ALTER TABLE "EventApplication" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "EventApplication_categoryId_idx" ON "EventApplication"("categoryId");

-- AddForeignKey
ALTER TABLE "EventApplication" ADD CONSTRAINT "EventApplication_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InvitationCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
