-- Reconcile schema previously present in deployed databases but absent from
-- migration history. Additive and compatible with both fresh and schema-only
-- databases. Never changes user roles/passwords or existing MFA values.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$ BEGIN
  CREATE TYPE "OrganizationInviteStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "TwoFactorSecret"
  ADD COLUMN IF NOT EXISTS "enrolledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastVerifiedStep" INTEGER;
ALTER TABLE "OrganizationSettings"
  ADD COLUMN IF NOT EXISTS "defaultCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "setupCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "usageType" TEXT;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "OrganizationInviteStatus" NOT NULL DEFAULT 'pending',
  "invitedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_usedAt_idx" ON "PasswordResetToken"("userId", "usedAt");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvite_tokenHash_key" ON "OrganizationInvite"("tokenHash");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_status_createdAt_idx" ON "OrganizationInvite"("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_email_idx" ON "OrganizationInvite"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_expiresAt_idx" ON "OrganizationInvite"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AppSetting_key_key" ON "AppSetting"("key");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"PasswordResetToken"'::regclass AND conname = 'PasswordResetToken_userId_fkey') THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"OrganizationInvite"'::regclass AND conname = 'OrganizationInvite_organizationId_fkey') THEN
    ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"OrganizationInvite"'::regclass AND conname = 'OrganizationInvite_invitedByUserId_fkey') THEN
    ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"AppSetting"'::regclass AND conname = 'AppSetting_updatedById_fkey') THEN
    ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Keep existing query indexes instead of dropping them to match an incomplete model.
CREATE INDEX IF NOT EXISTS "Asset_organizationId_inventoryStatus_idx" ON "Asset"("organizationId", "inventoryStatus");
CREATE INDEX IF NOT EXISTS "SecurityEvent_organizationId_riskScore_createdAt_idx" ON "SecurityEvent"("organizationId", "riskScore", "createdAt");

-- PostgreSQL truncated the original long index identifiers. Prisma uses its
-- own shortened identifiers; rename only when the canonical name is absent.
DO $$ BEGIN
  IF to_regclass('"SecurityTestFinding_organizationId_severity_status_createdA_idx"') IS NULL
     AND to_regclass('"SecurityTestFinding_organizationId_severity_status_createdAt_id"') IS NOT NULL THEN
    ALTER INDEX "SecurityTestFinding_organizationId_severity_status_createdAt_id" RENAME TO "SecurityTestFinding_organizationId_severity_status_createdA_idx";
  END IF;
  IF to_regclass('"SecurityTestTarget_organizationId_authorizationStatus_envir_idx"') IS NULL
     AND to_regclass('"SecurityTestTarget_organizationId_authorizationStatus_environme"') IS NOT NULL THEN
    ALTER INDEX "SecurityTestTarget_organizationId_authorizationStatus_environme" RENAME TO "SecurityTestTarget_organizationId_authorizationStatus_envir_idx";
  END IF;
END $$;
COMMIT;
