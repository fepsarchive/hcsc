-- Extend existing event and notification taxonomies.
ALTER TYPE "EventCategory" ADD VALUE IF NOT EXISTS 'security_test_finding';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'security_test_completed';

-- CreateEnum
CREATE TYPE "SecurityTestTargetType" AS ENUM ('repository', 'web_application', 'api');
CREATE TYPE "SecurityTestEnvironment" AS ENUM ('sandbox', 'staging', 'production');
CREATE TYPE "SecurityTestAuthorizationStatus" AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE "SecurityTestProvider" AS ENUM ('demo', 'self_hosted', 'managed');
CREATE TYPE "SecurityTestScanMode" AS ENUM ('quick', 'standard', 'deep');
CREATE TYPE "SecurityTestRunStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled', 'blocked');
CREATE TYPE "SecurityTestFindingStatus" AS ENUM ('open', 'investigating', 'accepted_risk', 'remediated', 'false_positive');

-- CreateTable
CREATE TABLE "SecurityTestTarget" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "name" TEXT NOT NULL,
  "targetType" "SecurityTestTargetType" NOT NULL,
  "target" TEXT NOT NULL,
  "environment" "SecurityTestEnvironment" NOT NULL,
  "description" TEXT,
  "authorizationStatus" "SecurityTestAuthorizationStatus" NOT NULL DEFAULT 'active',
  "scope" JSONB NOT NULL,
  "exclusions" JSONB NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityTestTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityTestAuthorization" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "scope" JSONB NOT NULL,
  "exclusions" JSONB NOT NULL,
  "status" "SecurityTestAuthorizationStatus" NOT NULL DEFAULT 'active',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityTestAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityTestRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "provider" "SecurityTestProvider" NOT NULL,
  "scanMode" "SecurityTestScanMode" NOT NULL,
  "status" "SecurityTestRunStatus" NOT NULL DEFAULT 'queued',
  "externalRunId" TEXT,
  "instructions" TEXT,
  "maxBudgetUsd" DOUBLE PRECISION,
  "maxTurns" INTEGER NOT NULL DEFAULT 150,
  "summary" TEXT,
  "findingCount" INTEGER NOT NULL DEFAULT 0,
  "criticalCount" INTEGER NOT NULL DEFAULT 0,
  "highCount" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityTestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityTestFinding" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "externalId" TEXT,
  "securityEventId" TEXT,
  "title" TEXT NOT NULL,
  "severity" "EventSeverity" NOT NULL,
  "status" "SecurityTestFindingStatus" NOT NULL DEFAULT 'open',
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "remediation" TEXT NOT NULL,
  "affectedResource" TEXT NOT NULL,
  "cvssScore" DOUBLE PRECISION,
  "pocAvailable" BOOLEAN NOT NULL DEFAULT false,
  "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityTestFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityTestTarget_organizationId_target_key" ON "SecurityTestTarget"("organizationId", "target");
CREATE INDEX "SecurityTestTarget_organizationId_authorizationStatus_environment_idx" ON "SecurityTestTarget"("organizationId", "authorizationStatus", "environment");
CREATE INDEX "SecurityTestAuthorization_organizationId_status_expiresAt_idx" ON "SecurityTestAuthorization"("organizationId", "status", "expiresAt");
CREATE INDEX "SecurityTestAuthorization_targetId_status_expiresAt_idx" ON "SecurityTestAuthorization"("targetId", "status", "expiresAt");
CREATE INDEX "SecurityTestRun_organizationId_status_createdAt_idx" ON "SecurityTestRun"("organizationId", "status", "createdAt");
CREATE INDEX "SecurityTestRun_targetId_createdAt_idx" ON "SecurityTestRun"("targetId", "createdAt");
CREATE UNIQUE INDEX "SecurityTestFinding_runId_externalId_key" ON "SecurityTestFinding"("runId", "externalId");
CREATE INDEX "SecurityTestFinding_organizationId_severity_status_createdAt_idx" ON "SecurityTestFinding"("organizationId", "severity", "status", "createdAt");
CREATE INDEX "SecurityTestFinding_runId_severity_idx" ON "SecurityTestFinding"("runId", "severity");

-- AddForeignKey
ALTER TABLE "SecurityTestTarget" ADD CONSTRAINT "SecurityTestTarget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityTestAuthorization" ADD CONSTRAINT "SecurityTestAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityTestAuthorization" ADD CONSTRAINT "SecurityTestAuthorization_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SecurityTestTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityTestRun" ADD CONSTRAINT "SecurityTestRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityTestRun" ADD CONSTRAINT "SecurityTestRun_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SecurityTestTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityTestFinding" ADD CONSTRAINT "SecurityTestFinding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityTestFinding" ADD CONSTRAINT "SecurityTestFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SecurityTestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
