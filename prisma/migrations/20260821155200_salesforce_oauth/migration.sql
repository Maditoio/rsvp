-- CreateTable
CREATE TABLE "SalesforceConnection" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "salesforceOrgId" TEXT,
    "instanceUrl" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "connectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesforceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesforceConnection_organisationId_key" ON "SalesforceConnection"("organisationId");

-- CreateIndex
CREATE INDEX "SalesforceConnection_connectedByUserId_idx" ON "SalesforceConnection"("connectedByUserId");

-- AddForeignKey
ALTER TABLE "SalesforceConnection" ADD CONSTRAINT "SalesforceConnection_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesforceConnection" ADD CONSTRAINT "SalesforceConnection_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
