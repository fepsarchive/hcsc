-- AlterEnum
ALTER TYPE "EventSeverity" ADD VALUE IF NOT EXISTS 'info';

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'false_positive';

-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'auth_failure';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'mfa_failure';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'login_success';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'admin_access_denied';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'admin_access_granted';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'settings_changed';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'role_changed';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'status_changed';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'trap_triggered';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'data_asset_risk';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'access_request_created';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'zero_trust_decision';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'compliance_gap';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'system_health_degraded';
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'report_generated';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "inventoryType" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "exposure" TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "environment" TEXT NOT NULL DEFAULT 'hybrid';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "inventoryStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "actorUserId" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "actorEmail" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "targetType" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "targetId" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "SecurityEvent" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_organizationId_inventoryStatus_idx" ON "Asset"("organizationId", "inventoryStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityEvent_organizationId_riskScore_createdAt_idx" ON "SecurityEvent"("organizationId", "riskScore", "createdAt");
