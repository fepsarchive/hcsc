-- CreateEnum
CREATE TYPE "CloudMode" AS ENUM ('private_cloud', 'public_cloud', 'hybrid_cloud');

-- CreateEnum
CREATE TYPE "CloudLocation" AS ENUM ('private_cloud', 'public_cloud', 'saas', 'backup', 'deception');

-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('public', 'internal', 'confidential', 'sensitive', 'critical');

-- CreateEnum
CREATE TYPE "DataTemperature" AS ENUM ('hot', 'warm', 'cold');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('database', 'object_storage', 'file_share', 'saas_export', 'backup_archive', 'deception_storage');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "DeviceTrust" AS ENUM ('trusted', 'managed', 'unknown', 'compromised');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('read', 'write', 'export', 'delete', 'admin');

-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('user', 'service', 'third_party');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('active', 'watchlist', 'suspicious', 'isolated');

-- CreateEnum
CREATE TYPE "ZeroTrustDecision" AS ENUM ('allow', 'limited_allow', 'require_step_up_auth', 'deny', 'isolate');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'step_up', 'isolated');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('open', 'investigating', 'contained', 'resolved');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('unauthorized_access_attempt', 'suspicious_export', 'public_bucket_detected', 'missing_encryption', 'impossible_travel', 'api_abuse', 'deception_triggered', 'ransomware_indicator', 'privilege_escalation', 'policy_violation', 'third_party_anomaly', 'visibility_gap');

-- CreateEnum
CREATE TYPE "SoarAction" AS ENUM ('account_lock', 'revoke_token', 'require_mfa', 'isolate_identity', 'isolate_resource', 'create_ticket', 'notify_security_team', 'mark_contained', 'mark_resolved');

-- CreateEnum
CREATE TYPE "DeceptionAssetType" AS ENUM ('bucket', 'database', 'api', 'token_store', 'log_archive');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('general', 'critical_data', 'zero_trust', 'deception', 'nist', 'privacy', 'demo');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('security_admin', 'cloud_security_analyst', 'compliance_officer', 'auditor', 'executive');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'invited', 'suspended');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('info', 'warning', 'high', 'critical');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure', 'blocked');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('critical_event', 'deception_alarm', 'report_ready', 'compliance_changed', 'playbook_completed', 'access_request_pending', 'simulation_completed');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('pending_2fa', 'active', 'revoked', 'expired');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "cloudMode" "CloudMode" NOT NULL,
    "complianceFrameworks" JSONB NOT NULL,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" TEXT,
    "avatarInitials" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissionOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'pending_2fa',
    "is2FAVerified" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "location" "CloudLocation" NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "classification" "DataClassification" NOT NULL,
    "temperature" "DataTemperature" NOT NULL,
    "owner" TEXT NOT NULL,
    "encryptionEnabled" BOOLEAN NOT NULL,
    "kmsEnabled" BOOLEAN NOT NULL,
    "backupEnabled" BOOLEAN NOT NULL,
    "kvkkScope" BOOLEAN NOT NULL,
    "gdprScope" BOOLEAN NOT NULL,
    "privacyTags" JSONB NOT NULL,
    "retentionPolicy" TEXT NOT NULL,
    "anonymizationStatus" TEXT NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount24h" INTEGER NOT NULL DEFAULT 0,
    "accessIntensity" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'low',
    "riskReasons" JSONB NOT NULL,
    "recommendedControls" JSONB NOT NULL,
    "findings" JSONB NOT NULL,
    "isDeception" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IdentityType" NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "homeLocation" "CloudLocation" NOT NULL,
    "region" TEXT NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deviceTrust" "DeviceTrust" NOT NULL,
    "anomalyScore" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "status" "IdentityStatus" NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "notes" JSONB NOT NULL,
    "accessVolume24h" INTEGER NOT NULL DEFAULT 0,
    "tags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "identityProfileId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "requestedAction" "AccessAction" NOT NULL,
    "justification" TEXT,
    "sourceLocation" "CloudLocation" NOT NULL,
    "sourceRegion" TEXT NOT NULL,
    "deviceTrust" "DeviceTrust" NOT NULL,
    "mfa" BOOLEAN NOT NULL DEFAULT false,
    "anomalyScore" INTEGER NOT NULL DEFAULT 0,
    "locationRisk" "RiskLevel" NOT NULL,
    "timeRisk" TEXT NOT NULL,
    "decision" "ZeroTrustDecision",
    "riskScore" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "decisionReasons" JSONB NOT NULL,
    "requiredActions" JSONB NOT NULL,
    "policyMatches" JSONB NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL,
    "category" "EventCategory" NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relatedControl" TEXT,
    "recommendation" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'open',
    "evidence" JSONB NOT NULL,
    "playbookActions" JSONB NOT NULL,
    "relatedAssetId" TEXT,
    "relatedIdentityId" TEXT,
    "relatedAccessRequestId" TEXT,
    "relatedDeceptionAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTimelineEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeceptionAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" "CloudLocation" NOT NULL,
    "description" TEXT NOT NULL,
    "containsRealData" BOOLEAN NOT NULL DEFAULT false,
    "fakeType" "DeceptionAssetType" NOT NULL,
    "lureScore" INTEGER NOT NULL,
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "mappedThreat" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL,
    "recommendedResponse" TEXT NOT NULL,
    "autoActions" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeceptionAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeceptionTrigger" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deceptionAssetId" TEXT NOT NULL,
    "identityProfileId" TEXT,
    "eventId" TEXT,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "requestHeaders" JSONB,
    "requestPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeceptionTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "action" "SoarAction" NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "executedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "iso27001Score" INTEGER NOT NULL,
    "kvkkScore" INTEGER NOT NULL,
    "gdprScore" INTEGER NOT NULL,
    "indicators" JSONB NOT NULL,
    "matrix" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceFunctionScore" (
    "id" TEXT NOT NULL,
    "complianceSnapshotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "controls" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceFunctionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "summary" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "recommendedActions" JSONB NOT NULL,
    "relatedControls" JSONB NOT NULL,
    "markdownContent" TEXT,
    "snapshotJson" JSONB NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEventLink" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "ReportEventLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAssetLink" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "ReportAssetLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL,
    "result" "AuditResult" NOT NULL,
    "ipAddress" TEXT,
    "device" TEXT,
    "details" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "EventSeverity" NOT NULL,
    "module" TEXT NOT NULL,
    "actionHref" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "cloudMode" "CloudMode" NOT NULL,
    "complianceFrameworks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "criticalClassificationWeight" INTEGER NOT NULL,
    "missingEncryptionWeight" INTEGER NOT NULL,
    "publicCloudSensitiveWeight" INTEGER NOT NULL,
    "missingBackupWeight" INTEGER NOT NULL,
    "noKmsWeight" INTEGER NOT NULL,
    "openCriticalEventWeight" INTEGER NOT NULL,
    "deceptionTriggerWeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportBranding" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "reportFooter" TEXT NOT NULL,
    "preparedByLabel" TEXT NOT NULL,
    "confidentialityLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "generatedEventIds" JSONB NOT NULL,
    "generatedReportIds" JSONB NOT NULL,
    "affectedModules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_organizationId_userId_status_idx" ON "Session"("organizationId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorSecret_userId_key" ON "TwoFactorSecret"("userId");

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_usedAt_idx" ON "RecoveryCode"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "Asset_organizationId_classification_idx" ON "Asset"("organizationId", "classification");

-- CreateIndex
CREATE INDEX "Asset_organizationId_riskLevel_idx" ON "Asset"("organizationId", "riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_organizationId_path_key" ON "Asset"("organizationId", "path");

-- CreateIndex
CREATE INDEX "IdentityProfile_organizationId_status_idx" ON "IdentityProfile"("organizationId", "status");

-- CreateIndex
CREATE INDEX "IdentityProfile_organizationId_type_idx" ON "IdentityProfile"("organizationId", "type");

-- CreateIndex
CREATE INDEX "AccessRequest_organizationId_status_requestedAt_idx" ON "AccessRequest"("organizationId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "AccessRequest_organizationId_identityProfileId_idx" ON "AccessRequest"("organizationId", "identityProfileId");

-- CreateIndex
CREATE INDEX "AccessRequest_organizationId_assetId_idx" ON "AccessRequest"("organizationId", "assetId");

-- CreateIndex
CREATE INDEX "SecurityEvent_organizationId_severity_status_createdAt_idx" ON "SecurityEvent"("organizationId", "severity", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_organizationId_category_idx" ON "SecurityEvent"("organizationId", "category");

-- CreateIndex
CREATE INDEX "EventTimelineEntry_eventId_createdAt_idx" ON "EventTimelineEntry"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "DeceptionAsset_organizationId_fakeType_idx" ON "DeceptionAsset"("organizationId", "fakeType");

-- CreateIndex
CREATE UNIQUE INDEX "DeceptionAsset_organizationId_name_key" ON "DeceptionAsset"("organizationId", "name");

-- CreateIndex
CREATE INDEX "DeceptionTrigger_organizationId_createdAt_idx" ON "DeceptionTrigger"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaybookExecution_organizationId_createdAt_idx" ON "PlaybookExecution"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceSnapshot_organizationId_createdAt_idx" ON "ComplianceSnapshot"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_organizationId_type_createdAt_idx" ON "Report"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportEventLink_reportId_eventId_key" ON "ReportEventLink"("reportId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAssetLink_reportId_assetId_key" ON "ReportAssetLink"("reportId", "assetId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_action_idx" ON "AuditLog"("organizationId", "action");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_readAt_createdAt_idx" ON "Notification"("organizationId", "userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskPolicy_organizationId_key" ON "RiskPolicy"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportBranding_organizationId_key" ON "ReportBranding"("organizationId");

-- CreateIndex
CREATE INDEX "SimulationRun_organizationId_createdAt_idx" ON "SimulationRun"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorSecret" ADD CONSTRAINT "TwoFactorSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityProfile" ADD CONSTRAINT "IdentityProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_identityProfileId_fkey" FOREIGN KEY ("identityProfileId") REFERENCES "IdentityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_relatedAssetId_fkey" FOREIGN KEY ("relatedAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_relatedIdentityId_fkey" FOREIGN KEY ("relatedIdentityId") REFERENCES "IdentityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_relatedAccessRequestId_fkey" FOREIGN KEY ("relatedAccessRequestId") REFERENCES "AccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_relatedDeceptionAssetId_fkey" FOREIGN KEY ("relatedDeceptionAssetId") REFERENCES "DeceptionAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTimelineEntry" ADD CONSTRAINT "EventTimelineEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceptionAsset" ADD CONSTRAINT "DeceptionAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceptionTrigger" ADD CONSTRAINT "DeceptionTrigger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceptionTrigger" ADD CONSTRAINT "DeceptionTrigger_deceptionAssetId_fkey" FOREIGN KEY ("deceptionAssetId") REFERENCES "DeceptionAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceptionTrigger" ADD CONSTRAINT "DeceptionTrigger_identityProfileId_fkey" FOREIGN KEY ("identityProfileId") REFERENCES "IdentityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeceptionTrigger" ADD CONSTRAINT "DeceptionTrigger_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookExecution" ADD CONSTRAINT "PlaybookExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookExecution" ADD CONSTRAINT "PlaybookExecution_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSnapshot" ADD CONSTRAINT "ComplianceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFunctionScore" ADD CONSTRAINT "ComplianceFunctionScore_complianceSnapshotId_fkey" FOREIGN KEY ("complianceSnapshotId") REFERENCES "ComplianceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEventLink" ADD CONSTRAINT "ReportEventLink_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEventLink" ADD CONSTRAINT "ReportEventLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAssetLink" ADD CONSTRAINT "ReportAssetLink_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAssetLink" ADD CONSTRAINT "ReportAssetLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPolicy" ADD CONSTRAINT "RiskPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportBranding" ADD CONSTRAINT "ReportBranding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
