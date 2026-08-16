-- CreateTable
CREATE TABLE "IntegrationEndpoint" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "endpointUrl" TEXT NOT NULL,
  "signingSecretCiphertext" TEXT NOT NULL,
  "eventTypes" JSONB NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastDeliveryStatus" TEXT,
  "lastDeliveryAt" TIMESTAMP(3),
  "lastResponseCode" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEndpoint_organizationId_endpointUrl_key" ON "IntegrationEndpoint"("organizationId", "endpointUrl");
CREATE INDEX "IntegrationEndpoint_organizationId_isEnabled_idx" ON "IntegrationEndpoint"("organizationId", "isEnabled");

-- AddForeignKey
ALTER TABLE "IntegrationEndpoint" ADD CONSTRAINT "IntegrationEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
