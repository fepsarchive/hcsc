CREATE TABLE "ConnectedDomain" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "verificationToken" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending_verification',
  "zoneId" TEXT,
  "tokenCiphertext" TEXT,
  "lastCheck" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConnectedDomain_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ConnectedDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConnectedDomain_organizationId_hostname_key" ON "ConnectedDomain"("organizationId", "hostname");
CREATE INDEX "ConnectedDomain_organizationId_status_idx" ON "ConnectedDomain"("organizationId", "status");
