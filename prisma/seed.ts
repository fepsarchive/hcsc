import "dotenv/config";

import { createHash } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
} from "@prisma/client";

const AccessAction = {
  read: "read",
  write: "write",
  export: "export",
  delete: "delete",
  admin: "admin",
} as const;

const AuditResult = {
  success: "success",
  failure: "failure",
  blocked: "blocked",
} as const;

const AuditSeverity = {
  info: "info",
  warning: "warning",
  high: "high",
  critical: "critical",
} as const;

const CloudLocation = {
  private_cloud: "private_cloud",
  public_cloud: "public_cloud",
  saas: "saas",
  backup: "backup",
  deception: "deception",
} as const;

const CloudMode = {
  private_cloud: "private_cloud",
  public_cloud: "public_cloud",
  hybrid_cloud: "hybrid_cloud",
} as const;

const DataClassification = {
  public: "public",
  internal: "internal",
  confidential: "confidential",
  sensitive: "sensitive",
  critical: "critical",
} as const;

const DataTemperature = {
  hot: "hot",
  warm: "warm",
  cold: "cold",
} as const;

const DeceptionAssetType = {
  bucket: "bucket",
  database: "database",
  api: "api",
  token_store: "token_store",
  log_archive: "log_archive",
} as const;

const DeviceTrust = {
  trusted: "trusted",
  managed: "managed",
  unknown: "unknown",
  compromised: "compromised",
} as const;

const EventCategory = {
  unauthorized_access_attempt: "unauthorized_access_attempt",
  suspicious_export: "suspicious_export",
  public_bucket_detected: "public_bucket_detected",
  missing_encryption: "missing_encryption",
  impossible_travel: "impossible_travel",
  api_abuse: "api_abuse",
  deception_triggered: "deception_triggered",
  ransomware_indicator: "ransomware_indicator",
  privilege_escalation: "privilege_escalation",
  policy_violation: "policy_violation",
  third_party_anomaly: "third_party_anomaly",
  visibility_gap: "visibility_gap",
} as const;

const EventSeverity = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

const EventStatus = {
  open: "open",
  investigating: "investigating",
  contained: "contained",
  resolved: "resolved",
} as const;

const IdentityStatus = {
  active: "active",
  watchlist: "watchlist",
  suspicious: "suspicious",
  isolated: "isolated",
} as const;

const IdentityType = {
  user: "user",
  service: "service",
  third_party: "third_party",
} as const;

const NotificationType = {
  critical_event: "critical_event",
  deception_alarm: "deception_alarm",
  report_ready: "report_ready",
  compliance_changed: "compliance_changed",
  playbook_completed: "playbook_completed",
  access_request_pending: "access_request_pending",
  simulation_completed: "simulation_completed",
} as const;

const ReportType = {
  general: "general",
  critical_data: "critical_data",
  zero_trust: "zero_trust",
  deception: "deception",
  nist: "nist",
  privacy: "privacy",
  demo: "demo",
} as const;

const RequestStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  step_up: "step_up",
  isolated: "isolated",
} as const;

const RiskLevel = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

const SoarAction = {
  account_lock: "account_lock",
  revoke_token: "revoke_token",
  require_mfa: "require_mfa",
  isolate_identity: "isolate_identity",
  isolate_resource: "isolate_resource",
  create_ticket: "create_ticket",
  notify_security_team: "notify_security_team",
  mark_contained: "mark_contained",
  mark_resolved: "mark_resolved",
} as const;

const StorageType = {
  database: "database",
  object_storage: "object_storage",
  file_share: "file_share",
  saas_export: "saas_export",
  backup_archive: "backup_archive",
  deception_storage: "deception_storage",
} as const;

const UserRole = {
  security_admin: "security_admin",
  cloud_security_analyst: "cloud_security_analyst",
  compliance_officer: "compliance_officer",
  auditor: "auditor",
  executive: "executive",
} as const;

const UserStatus = {
  active: "active",
  invited: "invited",
  suspended: "suspended",
} as const;

const ZeroTrustDecision = {
  allow: "allow",
  limited_allow: "limited_allow",
  require_step_up_auth: "require_step_up_auth",
  deny: "deny",
  isolate: "isolate",
} as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run prisma/seed.ts");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const NOW = new Date("2026-05-07T09:30:00.000Z");
const ORGANIZATION_ID = "org_astrasec_financial_cloud_lab";

function demoPasswordHash() {
  return `demo-password-hash-${createHash("sha256").update("demo123").digest("hex").slice(0, 16)}`;
}

async function upsertOrganization() {
  return prisma.organization.upsert({
    where: { id: ORGANIZATION_ID },
    update: {
      name: "AstraSec Financial Cloud Lab",
      slug: "astrasec-financial-cloud-lab",
      plan: "Enterprise Security Workspace",
      region: "Türkiye / EU",
      cloudMode: CloudMode.hybrid_cloud,
      complianceFrameworks: ["KVKK", "GDPR", "ISO 27001", "NIST CSF 2.0"],
      demoMode: true,
      onboardingCompleted: true,
    },
    create: {
      id: ORGANIZATION_ID,
      name: "AstraSec Financial Cloud Lab",
      slug: "astrasec-financial-cloud-lab",
      plan: "Enterprise Security Workspace",
      region: "Türkiye / EU",
      cloudMode: CloudMode.hybrid_cloud,
      complianceFrameworks: ["KVKK", "GDPR", "ISO 27001", "NIST CSF 2.0"],
      demoMode: true,
      onboardingCompleted: true,
    },
  });
}

async function upsertUsers() {
  const users = [
    {
      id: "user_security_admin",
      name: "Eyşan Yıldırım",
      email: "security.admin@hcsc.local",
      role: UserRole.security_admin,
      department: "Security Operations",
      avatarInitials: "EY",
    },
    {
      id: "user_analyst",
      name: "Emir Demirtaş",
      email: "analyst@hcsc.local",
      role: UserRole.cloud_security_analyst,
      department: "Cloud Security",
      avatarInitials: "ED",
    },
    {
      id: "user_compliance",
      name: "Selin Doğan",
      email: "compliance@hcsc.local",
      role: UserRole.compliance_officer,
      department: "Compliance",
      avatarInitials: "SD",
    },
    {
      id: "user_auditor",
      name: "Murat Yaman",
      email: "auditor@hcsc.local",
      role: UserRole.auditor,
      department: "Audit",
      avatarInitials: "MY",
    },
    {
      id: "user_executive",
      name: "Deniz Aksoy",
      email: "executive@hcsc.local",
      role: UserRole.executive,
      department: "Executive Office",
      avatarInitials: "DA",
    },
  ] as const;

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        department: user.department,
        avatarInitials: user.avatarInitials,
        passwordHash: demoPasswordHash(),
        status: UserStatus.active,
        mfaEnabled: true,
        lastLoginAt: NOW,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: demoPasswordHash(),
        role: user.role,
        department: user.department,
        avatarInitials: user.avatarInitials,
        status: UserStatus.active,
        mfaEnabled: true,
        lastLoginAt: NOW,
      },
    });
  }

  const storedUsers = await prisma.user.findMany({
    where: {
      email: {
        in: users.map((item) => item.email),
      },
    },
  });

  for (const user of storedUsers) {
    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: ORGANIZATION_ID,
        },
      },
      update: {
        role: user.role,
      },
      create: {
        userId: user.id,
        organizationId: ORGANIZATION_ID,
        role: user.role,
      },
    });

    await prisma.twoFactorSecret.upsert({
      where: { userId: user.id },
      update: {
        secret: `demo-totp-secret-${user.id}`,
        issuer: "Hybrid Cloud Security Console",
        label: user.email,
        enabledAt: NOW,
      },
      create: {
        userId: user.id,
        secret: `demo-totp-secret-${user.id}`,
        issuer: "Hybrid Cloud Security Console",
        label: user.email,
        enabledAt: NOW,
      },
    });
  }
}

async function upsertSettings() {
  await prisma.organizationSettings.upsert({
    where: { organizationId: ORGANIZATION_ID },
    update: {
      region: "Türkiye / EU",
      cloudMode: CloudMode.hybrid_cloud,
      complianceFrameworks: ["KVKK", "GDPR", "ISO 27001", "NIST CSF 2.0"],
      usageType: "fintech",
      defaultCurrency: "TRY",
      setupCompletedAt: NOW,
    },
    create: {
      organizationId: ORGANIZATION_ID,
      region: "Türkiye / EU",
      cloudMode: CloudMode.hybrid_cloud,
      complianceFrameworks: ["KVKK", "GDPR", "ISO 27001", "NIST CSF 2.0"],
      usageType: "fintech",
      defaultCurrency: "TRY",
      setupCompletedAt: NOW,
    },
  });

  await prisma.riskPolicy.upsert({
    where: { organizationId: ORGANIZATION_ID },
    update: {
      criticalClassificationWeight: 24,
      missingEncryptionWeight: 18,
      publicCloudSensitiveWeight: 16,
      missingBackupWeight: 10,
      noKmsWeight: 12,
      openCriticalEventWeight: 14,
      deceptionTriggerWeight: 20,
    },
    create: {
      organizationId: ORGANIZATION_ID,
      criticalClassificationWeight: 24,
      missingEncryptionWeight: 18,
      publicCloudSensitiveWeight: 16,
      missingBackupWeight: 10,
      noKmsWeight: 12,
      openCriticalEventWeight: 14,
      deceptionTriggerWeight: 20,
    },
  });

  await prisma.reportBranding.upsert({
    where: { organizationId: ORGANIZATION_ID },
    update: {
      companyName: "AstraSec Financial Cloud Lab",
      reportFooter: "Generated by Hybrid Cloud Security Console",
      preparedByLabel: "Prepared by HCSC",
      confidentialityLabel: "Internal / Confidential",
    },
    create: {
      organizationId: ORGANIZATION_ID,
      companyName: "AstraSec Financial Cloud Lab",
      reportFooter: "Generated by Hybrid Cloud Security Console",
      preparedByLabel: "Prepared by HCSC",
      confidentialityLabel: "Internal / Confidential",
    },
  });
}

async function upsertAssets() {
  const assets = [
    {
      id: "asset_private_customer_db_prod",
      name: "customer-db-prod",
      path: "private-cloud/customer-db-prod",
      dataType: "Customer Core Records",
      location: CloudLocation.private_cloud,
      storageType: StorageType.database,
      classification: DataClassification.critical,
      temperature: DataTemperature.hot,
      owner: "Data Governance",
      encryptionEnabled: true,
      kmsEnabled: true,
      backupEnabled: true,
      kvkkScope: true,
      gdprScope: true,
      privacyTags: ["PII", "KVKK", "GDPR"],
      retentionPolicy: "5 years",
      anonymizationStatus: "partial",
      accessCount24h: 118,
      accessIntensity: 88,
      riskScore: 92,
      riskLevel: RiskLevel.critical,
      riskReasons: ["Critical classification", "High access intensity", "Open security events"],
      recommendedControls: ["RBAC/ABAC", "MFA", "DLP"],
      findings: ["Export actions should require step-up authentication."],
      isDeception: false,
    },
    {
      id: "asset_private_finance_ledger",
      name: "finance-ledger",
      path: "private-cloud/finance-ledger",
      dataType: "Financial Ledger",
      location: CloudLocation.private_cloud,
      storageType: StorageType.database,
      classification: DataClassification.critical,
      temperature: DataTemperature.warm,
      owner: "Finance Security",
      encryptionEnabled: true,
      kmsEnabled: false,
      backupEnabled: true,
      kvkkScope: true,
      gdprScope: true,
      privacyTags: ["Financial", "KVKK", "GDPR"],
      retentionPolicy: "10 years",
      anonymizationStatus: "missing",
      accessCount24h: 44,
      accessIntensity: 48,
      riskScore: 86,
      riskLevel: RiskLevel.high,
      riskReasons: ["Critical classification", "Missing KMS rotation"],
      recommendedControls: ["KMS", "SIEM", "Backup validation"],
      findings: ["KMS rotation should be enabled."],
      isDeception: false,
    },
    {
      id: "asset_public_analytics_bucket",
      name: "analytics-bucket",
      path: "public-cloud/analytics-bucket",
      dataType: "Analytics Export Datasets",
      location: CloudLocation.public_cloud,
      storageType: StorageType.object_storage,
      classification: DataClassification.sensitive,
      temperature: DataTemperature.hot,
      owner: "BI Team",
      encryptionEnabled: false,
      kmsEnabled: false,
      backupEnabled: true,
      kvkkScope: false,
      gdprScope: true,
      privacyTags: ["Usage", "GDPR"],
      retentionPolicy: "12 months",
      anonymizationStatus: "partial",
      accessCount24h: 92,
      accessIntensity: 80,
      riskScore: 100,
      riskLevel: RiskLevel.critical,
      riskReasons: ["Sensitive data in public cloud", "Missing encryption", "Missing KMS"],
      recommendedControls: ["Encryption", "KMS", "CSPM"],
      findings: ["Public cloud encryption baseline is missing."],
      isDeception: false,
    },
    {
      id: "asset_public_api_gateway_logs",
      name: "api-gateway-logs",
      path: "public-cloud/api-gateway-logs",
      dataType: "API Logs",
      location: CloudLocation.public_cloud,
      storageType: StorageType.object_storage,
      classification: DataClassification.internal,
      temperature: DataTemperature.hot,
      owner: "API Security",
      encryptionEnabled: true,
      kmsEnabled: true,
      backupEnabled: true,
      kvkkScope: false,
      gdprScope: false,
      privacyTags: ["Telemetry"],
      retentionPolicy: "6 months",
      anonymizationStatus: "not_applicable",
      accessCount24h: 64,
      accessIntensity: 51,
      riskScore: 51,
      riskLevel: RiskLevel.medium,
      riskReasons: ["Operationally exposed telemetry"],
      recommendedControls: ["SIEM", "Integrity monitoring"],
      findings: ["Log forwarding should be monitored."],
      isDeception: false,
    },
    {
      id: "asset_saas_crm_export_archive",
      name: "crm-export-archive",
      path: "saas/crm-export-archive",
      dataType: "CRM Export Archives",
      location: CloudLocation.saas,
      storageType: StorageType.saas_export,
      classification: DataClassification.sensitive,
      temperature: DataTemperature.warm,
      owner: "Sales Operations",
      encryptionEnabled: true,
      kmsEnabled: false,
      backupEnabled: false,
      kvkkScope: true,
      gdprScope: true,
      privacyTags: ["CRM", "PII"],
      retentionPolicy: "18 months",
      anonymizationStatus: "partial",
      accessCount24h: 33,
      accessIntensity: 40,
      riskScore: 89,
      riskLevel: RiskLevel.critical,
      riskReasons: ["Sensitive export archive", "Missing backup", "Third-party exposure"],
      recommendedControls: ["CASB", "DLP", "MFA"],
      findings: ["Third-party archive governance should be tightened."],
      isDeception: false,
    },
    {
      id: "asset_backup_cold_customer_archive",
      name: "cold-customer-archive",
      path: "backup/cold-customer-archive",
      dataType: "Cold Backup Archive",
      location: CloudLocation.backup,
      storageType: StorageType.backup_archive,
      classification: DataClassification.confidential,
      temperature: DataTemperature.cold,
      owner: "Backup Team",
      encryptionEnabled: true,
      kmsEnabled: true,
      backupEnabled: true,
      kvkkScope: true,
      gdprScope: false,
      privacyTags: ["Archive", "KVKK"],
      retentionPolicy: "7 years",
      anonymizationStatus: "not_applicable",
      accessCount24h: 6,
      accessIntensity: 8,
      riskScore: 34,
      riskLevel: RiskLevel.low,
      riskReasons: ["Protected cold archive"],
      recommendedControls: ["Restore drill", "Immutable retention"],
      findings: ["Recovery validation schedule should be refreshed."],
      isDeception: false,
    },
    {
      id: "asset_deception_admin_secrets_bucket",
      name: "admin-secrets-bucket-shadow",
      path: "deception/admin-secrets-bucket-shadow",
      dataType: "Deception Storage",
      location: CloudLocation.deception,
      storageType: StorageType.deception_storage,
      classification: DataClassification.critical,
      temperature: DataTemperature.warm,
      owner: "Active Defense",
      encryptionEnabled: true,
      kmsEnabled: true,
      backupEnabled: false,
      kvkkScope: false,
      gdprScope: false,
      privacyTags: ["Deception"],
      retentionPolicy: "N/A",
      anonymizationStatus: "not_applicable",
      accessCount24h: 1,
      accessIntensity: 18,
      riskScore: 60,
      riskLevel: RiskLevel.medium,
      riskReasons: ["Deception monitoring surface"],
      recommendedControls: ["SIEM", "Active Defense"],
      findings: ["Deception telemetry should remain isolated."],
      isDeception: true,
    },
    {
      id: "asset_private_iam_audit_logs",
      name: "iam-audit-logs",
      path: "private-cloud/iam-audit-logs",
      dataType: "Identity Audit Logs",
      location: CloudLocation.private_cloud,
      storageType: StorageType.file_share,
      classification: DataClassification.confidential,
      temperature: DataTemperature.warm,
      owner: "Identity Governance",
      encryptionEnabled: true,
      kmsEnabled: true,
      backupEnabled: true,
      kvkkScope: false,
      gdprScope: false,
      privacyTags: ["Audit", "Identity"],
      retentionPolicy: "24 months",
      anonymizationStatus: "not_applicable",
      accessCount24h: 24,
      accessIntensity: 29,
      riskScore: 43,
      riskLevel: RiskLevel.medium,
      riskReasons: ["Critical governance trail"],
      recommendedControls: ["Integrity monitoring", "Cold archive"],
      findings: ["Retention review should continue."],
      isDeception: false,
    },
  ] as const;

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: {
        organizationId_path: {
          organizationId: ORGANIZATION_ID,
          path: asset.path,
        },
      },
      update: {
        ...asset,
        organizationId: ORGANIZATION_ID,
        lastAccessedAt: NOW,
      },
      create: {
        ...asset,
        organizationId: ORGANIZATION_ID,
        lastAccessedAt: NOW,
      },
    });
  }
}

async function upsertIdentityProfiles() {
  const identities = [
    {
      id: "identity_security_admin",
      name: "security.admin",
      type: IdentityType.user,
      role: "Security Administrator",
      department: "Security Operations",
      homeLocation: CloudLocation.private_cloud,
      region: "TR-IST",
      mfaEnabled: true,
      deviceTrust: DeviceTrust.trusted,
      anomalyScore: 12,
      riskScore: 21,
      status: IdentityStatus.active,
      notes: ["SOAR playbook approvals are handled here."],
      accessVolume24h: 18,
      tags: ["privileged", "soc"],
    },
    {
      id: "identity_data_analyst",
      name: "data.analyst",
      type: IdentityType.user,
      role: "Cloud Security Analyst",
      department: "Cloud Security",
      homeLocation: CloudLocation.private_cloud,
      region: "TR-IST",
      mfaEnabled: true,
      deviceTrust: DeviceTrust.managed,
      anomalyScore: 24,
      riskScore: 33,
      status: IdentityStatus.active,
      notes: ["Analytics and telemetry visibility account."],
      accessVolume24h: 31,
      tags: ["analyst"],
    },
    {
      id: "identity_finance_manager",
      name: "finance.manager",
      type: IdentityType.user,
      role: "Finance Manager",
      department: "Finance",
      homeLocation: CloudLocation.private_cloud,
      region: "TR-ANK",
      mfaEnabled: false,
      deviceTrust: DeviceTrust.unknown,
      anomalyScore: 68,
      riskScore: 72,
      status: IdentityStatus.watchlist,
      notes: ["Off-hours export patterns observed."],
      accessVolume24h: 54,
      tags: ["finance", "export"],
    },
    {
      id: "identity_legacy_api_token",
      name: "legacy-api-token",
      type: IdentityType.third_party,
      role: "Legacy Partner Token",
      department: "Integrations",
      homeLocation: CloudLocation.public_cloud,
      region: "US-CENTRAL",
      mfaEnabled: false,
      deviceTrust: DeviceTrust.unknown,
      anomalyScore: 81,
      riskScore: 84,
      status: IdentityStatus.suspicious,
      notes: ["Legacy token with anomalous behavioral profile."],
      accessVolume24h: 78,
      tags: ["legacy", "third-party", "suspicious"],
    },
  ] as const;

  for (const identity of identities) {
    await prisma.identityProfile.upsert({
      where: { id: identity.id },
      update: {
        ...identity,
        organizationId: ORGANIZATION_ID,
        lastSeenAt: NOW,
      },
      create: {
        ...identity,
        organizationId: ORGANIZATION_ID,
        lastSeenAt: NOW,
      },
    });
  }
}

async function upsertDeceptionAssets() {
  const assets = [
    {
      id: "deception_legacy_customer_db_shadow",
      name: "legacy-customer-db-shadow",
      location: CloudLocation.deception,
      description: "Realistic fake legacy customer database for safe deception signaling.",
      containsRealData: false,
      fakeType: DeceptionAssetType.database,
      lureScore: 94,
      triggerCount: 1,
      mappedThreat: "APT / Credential Theft",
      severity: EventSeverity.critical,
      recommendedResponse: "isolate_identity, revoke_token, create_ticket",
      autoActions: [SoarAction.isolate_identity, SoarAction.revoke_token, SoarAction.create_ticket],
      status: "active",
    },
    {
      id: "deception_admin_secrets_bucket",
      name: "admin-secrets-bucket",
      location: CloudLocation.deception,
      description: "Fake privileged object storage lure.",
      containsRealData: false,
      fakeType: DeceptionAssetType.bucket,
      lureScore: 88,
      triggerCount: 0,
      mappedThreat: "Privilege Escalation",
      severity: EventSeverity.high,
      recommendedResponse: "notify_security_team, create_ticket",
      autoActions: [SoarAction.notify_security_team, SoarAction.create_ticket],
      status: "active",
    },
    {
      id: "deception_token_store_shadow",
      name: "token-store-shadow",
      location: CloudLocation.deception,
      description: "Fake token store to detect credential harvesting attempts.",
      containsRealData: false,
      fakeType: DeceptionAssetType.token_store,
      lureScore: 91,
      triggerCount: 0,
      mappedThreat: "Credential Theft",
      severity: EventSeverity.critical,
      recommendedResponse: "revoke_token, isolate_identity",
      autoActions: [SoarAction.revoke_token, SoarAction.isolate_identity],
      status: "active",
    },
    {
      id: "deception_log_archive_shadow",
      name: "forensic-log-archive-shadow",
      location: CloudLocation.deception,
      description: "Fake incident archive used to spot lateral curiosity in telemetry scope.",
      containsRealData: false,
      fakeType: DeceptionAssetType.log_archive,
      lureScore: 76,
      triggerCount: 0,
      mappedThreat: "Reconnaissance",
      severity: EventSeverity.medium,
      recommendedResponse: "create_ticket, notify_security_team",
      autoActions: [SoarAction.create_ticket, SoarAction.notify_security_team],
      status: "active",
    },
  ] as const;

  for (const asset of assets) {
    await prisma.deceptionAsset.upsert({
      where: {
        organizationId_name: {
          organizationId: ORGANIZATION_ID,
          name: asset.name,
        },
      },
      update: {
        ...asset,
        organizationId: ORGANIZATION_ID,
        lastTriggeredAt: asset.triggerCount > 0 ? NOW : null,
      },
      create: {
        ...asset,
        organizationId: ORGANIZATION_ID,
        lastTriggeredAt: asset.triggerCount > 0 ? NOW : null,
      },
    });
  }
}

async function upsertAccessRequests() {
  const ids = {
    analytics: "asset_public_analytics_bucket",
    finance: "asset_private_finance_ledger",
    customer: "asset_private_customer_db_prod",
    apiLogs: "asset_public_api_gateway_logs",
  };

  const requests = [
    {
      id: "request_export_analytics_bucket",
      identityProfileId: "identity_finance_manager",
      assetId: ids.analytics,
      requestedAction: AccessAction.export,
      justification: "Quarterly export validation",
      sourceLocation: CloudLocation.public_cloud,
      sourceRegion: "TR-IST",
      deviceTrust: DeviceTrust.unknown,
      mfa: false,
      anomalyScore: 72,
      locationRisk: RiskLevel.high,
      timeRisk: "off_hours",
      decision: ZeroTrustDecision.require_step_up_auth,
      riskScore: 88,
      status: RequestStatus.step_up,
      decisionReasons: ["Sensitive export action without MFA", "Off-hours access pattern"],
      requiredActions: ["step_up_auth", "manager_approval"],
      policyMatches: ["ZT-EXPORT-001", "ZT-MFA-002"],
    },
    {
      id: "request_finance_ledger_read",
      identityProfileId: "identity_data_analyst",
      assetId: ids.finance,
      requestedAction: AccessAction.read,
      justification: "Security posture review",
      sourceLocation: CloudLocation.private_cloud,
      sourceRegion: "TR-IST",
      deviceTrust: DeviceTrust.managed,
      mfa: true,
      anomalyScore: 18,
      locationRisk: RiskLevel.low,
      timeRisk: "normal",
      decision: ZeroTrustDecision.allow,
      riskScore: 22,
      status: RequestStatus.approved,
      decisionReasons: ["Managed device", "MFA enabled", "Low-risk read action"],
      requiredActions: [],
      policyMatches: ["ZT-READ-BASELINE"],
    },
    {
      id: "request_deception_probe",
      identityProfileId: "identity_legacy_api_token",
      assetId: ids.customer,
      requestedAction: AccessAction.read,
      justification: "Legacy integration sync",
      sourceLocation: CloudLocation.public_cloud,
      sourceRegion: "US-CENTRAL",
      deviceTrust: DeviceTrust.unknown,
      mfa: false,
      anomalyScore: 81,
      locationRisk: RiskLevel.high,
      timeRisk: "elevated",
      decision: ZeroTrustDecision.isolate,
      riskScore: 97,
      status: RequestStatus.isolated,
      decisionReasons: ["Legacy third-party token", "Deception-adjacent access signal", "High anomaly score"],
      requiredActions: ["revoke_token", "isolate_identity", "create_ticket"],
      policyMatches: ["ZT-DECEPTION-001", "ZT-3P-004"],
    },
    {
      id: "request_api_logs_admin",
      identityProfileId: "identity_security_admin",
      assetId: ids.apiLogs,
      requestedAction: AccessAction.admin,
      justification: "Telemetry retention validation",
      sourceLocation: CloudLocation.private_cloud,
      sourceRegion: "TR-IST",
      deviceTrust: DeviceTrust.trusted,
      mfa: true,
      anomalyScore: 10,
      locationRisk: RiskLevel.low,
      timeRisk: "normal",
      decision: ZeroTrustDecision.allow,
      riskScore: 14,
      status: RequestStatus.approved,
      decisionReasons: ["Privileged admin on trusted device with MFA"],
      requiredActions: [],
      policyMatches: ["ZT-ADMIN-ALLOW"],
    },
  ] as const;

  for (const request of requests) {
    await prisma.accessRequest.upsert({
      where: { id: request.id },
      update: {
        ...request,
        organizationId: ORGANIZATION_ID,
        requestedAt: NOW,
        decidedAt: NOW,
      },
      create: {
        ...request,
        organizationId: ORGANIZATION_ID,
        requestedAt: NOW,
        decidedAt: NOW,
      },
    });
  }
}

async function upsertEvents() {
  const events = [
    {
      id: "event_suspicious_export_01",
      title: "Suspicious export attempt on analytics bucket",
      severity: EventSeverity.critical,
      category: EventCategory.suspicious_export,
      source: "Zero Trust Engine",
      target: "analytics-bucket",
      description: "Sensitive export action requested from an unmanaged context without MFA.",
      relatedControl: "Zero Trust Export Policy",
      recommendation: "Require step-up authentication and review identity behavior.",
      status: EventStatus.investigating,
      evidence: { requestId: "request_export_analytics_bucket", anomalyScore: 72 },
      playbookActions: [SoarAction.require_mfa, SoarAction.notify_security_team],
      relatedAssetId: "asset_public_analytics_bucket",
      relatedIdentityId: "identity_finance_manager",
      relatedAccessRequestId: "request_export_analytics_bucket",
      relatedDeceptionAssetId: null,
    },
    {
      id: "event_missing_encryption_01",
      title: "Public cloud analytics storage missing encryption",
      severity: EventSeverity.high,
      category: EventCategory.missing_encryption,
      source: "Risk Engine",
      target: "analytics-bucket",
      description: "Public cloud sensitive asset is operating without encryption and KMS coverage.",
      relatedControl: "CSPM / Encryption Baseline",
      recommendation: "Enable encryption at rest and apply managed key controls.",
      status: EventStatus.open,
      evidence: { assetId: "asset_public_analytics_bucket", encryptionEnabled: false },
      playbookActions: [SoarAction.create_ticket, SoarAction.notify_security_team],
      relatedAssetId: "asset_public_analytics_bucket",
      relatedIdentityId: null,
      relatedAccessRequestId: null,
      relatedDeceptionAssetId: null,
    },
    {
      id: "event_deception_triggered_01",
      title: "Fake database deception alarm triggered",
      severity: EventSeverity.critical,
      category: EventCategory.deception_triggered,
      source: "Deception Engine",
      target: "legacy-customer-db-shadow",
      description: "Legacy partner token attempted to access a non-production deception database.",
      relatedControl: "Active Defense / Deception",
      recommendation: "Isolate identity, revoke token and create incident ticket.",
      status: EventStatus.contained,
      evidence: { deceptionAssetId: "deception_legacy_customer_db_shadow", identityProfileId: "identity_legacy_api_token" },
      playbookActions: [SoarAction.isolate_identity, SoarAction.revoke_token, SoarAction.create_ticket],
      relatedAssetId: null,
      relatedIdentityId: "identity_legacy_api_token",
      relatedAccessRequestId: "request_deception_probe",
      relatedDeceptionAssetId: "deception_legacy_customer_db_shadow",
    },
    {
      id: "event_visibility_gap_01",
      title: "Visibility gap: telemetry monitor offline",
      severity: EventSeverity.medium,
      category: EventCategory.visibility_gap,
      source: "Telemetry Monitor",
      target: "ops-telemetry",
      description: "A logging agent appears temporarily offline for one monitored source.",
      relatedControl: "Telemetry Baseline",
      recommendation: "Restore agent connectivity and confirm event coverage.",
      status: EventStatus.open,
      evidence: { monitor: "ops-telemetry" },
      playbookActions: [SoarAction.create_ticket],
      relatedAssetId: "asset_public_api_gateway_logs",
      relatedIdentityId: null,
      relatedAccessRequestId: null,
      relatedDeceptionAssetId: null,
    },
    {
      id: "event_policy_violation_01",
      title: "Zero Trust policy violation for privileged API action",
      severity: EventSeverity.high,
      category: EventCategory.policy_violation,
      source: "Policy Engine",
      target: "api-gateway-logs",
      description: "Policy set required additional telemetry review for privileged action.",
      relatedControl: "Policy Administrator",
      recommendation: "Track the privileged action in audit and governance review.",
      status: EventStatus.resolved,
      evidence: { requestId: "request_api_logs_admin" },
      playbookActions: [SoarAction.mark_resolved],
      relatedAssetId: "asset_public_api_gateway_logs",
      relatedIdentityId: "identity_security_admin",
      relatedAccessRequestId: "request_api_logs_admin",
      relatedDeceptionAssetId: null,
    },
    {
      id: "event_third_party_anomaly_01",
      title: "Third-party API token anomaly",
      severity: EventSeverity.high,
      category: EventCategory.third_party_anomaly,
      source: "Behavior Analytics",
      target: "legacy-api-token",
      description: "Unusual request volume detected from a third-party integration context.",
      relatedControl: "Behavioral Detection",
      recommendation: "Continue isolation and review connector contract.",
      status: EventStatus.investigating,
      evidence: { identityProfileId: "identity_legacy_api_token", requestVolume24h: 78 },
      playbookActions: [SoarAction.notify_security_team, SoarAction.create_ticket],
      relatedAssetId: null,
      relatedIdentityId: "identity_legacy_api_token",
      relatedAccessRequestId: null,
      relatedDeceptionAssetId: null,
    },
  ] as const;

  for (const event of events) {
    await prisma.securityEvent.upsert({
      where: { id: event.id },
      update: {
        ...event,
        organizationId: ORGANIZATION_ID,
      },
      create: {
        ...event,
        organizationId: ORGANIZATION_ID,
      },
    });
  }

  const timelineEntries = [
    {
      id: "timeline_suspicious_export_eval",
      eventId: "event_suspicious_export_01",
      actor: "Zero Trust Engine",
      message: "Request evaluated and step-up authentication required.",
    },
    {
      id: "timeline_deception_created",
      eventId: "event_deception_triggered_01",
      actor: "Deception Engine",
      message: "Critical deception alert created for legacy-customer-db-shadow access.",
    },
    {
      id: "timeline_deception_playbook",
      eventId: "event_deception_triggered_01",
      actor: "SOAR Engine",
      message: "Playbook executed: isolate_identity and revoke_token.",
    },
    {
      id: "timeline_visibility_gap",
      eventId: "event_visibility_gap_01",
      actor: "Telemetry Monitor",
      message: "Agent health degraded for ops-telemetry source.",
    },
  ] as const;

  for (const entry of timelineEntries) {
    await prisma.eventTimelineEntry.upsert({
      where: { id: entry.id },
      update: entry,
      create: entry,
    });
  }

  const playbooks = [
    {
      id: "playbook_deception_isolate_identity",
      eventId: "event_deception_triggered_01",
      action: SoarAction.isolate_identity,
      status: "completed",
      summary: "Identity isolated after deception trigger.",
      executedBy: "system",
    },
    {
      id: "playbook_deception_revoke_token",
      eventId: "event_deception_triggered_01",
      action: SoarAction.revoke_token,
      status: "completed",
      summary: "Legacy token revoked in simulation state.",
      executedBy: "system",
    },
  ] as const;

  for (const playbook of playbooks) {
    await prisma.playbookExecution.upsert({
      where: { id: playbook.id },
      update: {
        ...playbook,
        organizationId: ORGANIZATION_ID,
      },
      create: {
        ...playbook,
        organizationId: ORGANIZATION_ID,
      },
    });
  }

  await prisma.deceptionTrigger.upsert({
    where: { id: "trigger_legacy_customer_db_shadow_01" },
    update: {
      organizationId: ORGANIZATION_ID,
      deceptionAssetId: "deception_legacy_customer_db_shadow",
      identityProfileId: "identity_legacy_api_token",
      eventId: "event_deception_triggered_01",
      sourceIp: "203.0.113.24",
      userAgent: "legacy-partner-client/1.4",
      requestHeaders: { accept: "*/*", "x-demo-trap": "true" },
      requestPath: "/api/trap/legacy-customer-db-shadow",
    },
    create: {
      id: "trigger_legacy_customer_db_shadow_01",
      organizationId: ORGANIZATION_ID,
      deceptionAssetId: "deception_legacy_customer_db_shadow",
      identityProfileId: "identity_legacy_api_token",
      eventId: "event_deception_triggered_01",
      sourceIp: "203.0.113.24",
      userAgent: "legacy-partner-client/1.4",
      requestHeaders: { accept: "*/*", "x-demo-trap": "true" },
      requestPath: "/api/trap/legacy-customer-db-shadow",
    },
  });
}

async function upsertCompliance() {
  await prisma.complianceSnapshot.upsert({
    where: { id: "compliance_snapshot_v2_seed_01" },
    update: {
      organizationId: ORGANIZATION_ID,
      overallScore: 75,
      iso27001Score: 78,
      kvkkScore: 79,
      gdprScore: 67,
      indicators: {
        govern: "Policy coverage defined",
        detect: "Deception and event telemetry active",
      },
      matrix: {
        personalDataAssets: 12,
        encryptedAssets: 18,
        openCriticalEvents: 2,
      },
    },
    create: {
      id: "compliance_snapshot_v2_seed_01",
      organizationId: ORGANIZATION_ID,
      overallScore: 75,
      iso27001Score: 78,
      kvkkScore: 79,
      gdprScore: 67,
      indicators: {
        govern: "Policy coverage defined",
        detect: "Deception and event telemetry active",
      },
      matrix: {
        personalDataAssets: 12,
        encryptedAssets: 18,
        openCriticalEvents: 2,
      },
    },
  });

  const functionScores = [
    { id: "cf_govern", name: "Govern", score: 75, status: "warning", controls: ["Policy coverage"], gaps: ["Review cadence"], improvements: ["Quarterly review"] },
    { id: "cf_identify", name: "Identify", score: 82, status: "healthy", controls: ["Asset inventory"], gaps: ["Vendor asset traceability"], improvements: ["Improve SaaS metadata"] },
    { id: "cf_protect", name: "Protect", score: 71, status: "warning", controls: ["MFA", "Encryption"], gaps: ["Public encryption gap"], improvements: ["Enable KMS"] },
    { id: "cf_detect", name: "Detect", score: 79, status: "healthy", controls: ["SIEM", "Deception"], gaps: ["Visibility gap"], improvements: ["Restore telemetry"] },
    { id: "cf_respond", name: "Respond", score: 73, status: "warning", controls: ["SOAR playbooks"], gaps: ["Ticket automation"], improvements: ["Expand playbook coverage"] },
    { id: "cf_recover", name: "Recover", score: 70, status: "warning", controls: ["Backups"], gaps: ["Restore validation"], improvements: ["Run restore drill"] },
  ] as const;

  for (const item of functionScores) {
    await prisma.complianceFunctionScore.upsert({
      where: { id: item.id },
      update: {
        complianceSnapshotId: "compliance_snapshot_v2_seed_01",
        ...item,
      },
      create: {
        complianceSnapshotId: "compliance_snapshot_v2_seed_01",
        ...item,
      },
    });
  }
}

async function upsertReports() {
  await prisma.report.upsert({
    where: { id: "report_security_overview_seed_01" },
    update: {
      organizationId: ORGANIZATION_ID,
      title: "Security Overview Report",
      type: ReportType.general,
      status: "generated",
      summary: "Overall security score 75/100 with active critical deception detection and one unresolved encryption gap.",
      findings: [
        "Public cloud analytics storage lacks encryption and KMS coverage.",
        "Legacy third-party token triggered a deception database alarm.",
        "Zero Trust denied or constrained high-risk export behaviors.",
      ],
      risks: [
        "Sensitive analytics datasets are exposed to elevated export risk.",
        "Legacy integration credentials remain a high-risk attack surface.",
      ],
      recommendedActions: [
        "Enable encryption and KMS on analytics storage.",
        "Keep legacy partner token isolated until remediation is completed.",
        "Expand playbook coverage for export anomaly scenarios.",
      ],
      relatedControls: ["RBAC/ABAC", "MFA", "Encryption", "SIEM", "Deception"],
      markdownContent: "# Security Overview Report\n\nPersisted foundation report for HCSC v2 seed.",
      snapshotJson: {
        securityScore: 75,
        criticalEvents: 2,
        complianceScore: 75,
        generatedAt: NOW.toISOString(),
      },
      generatedBy: "system-seed",
    },
    create: {
      id: "report_security_overview_seed_01",
      organizationId: ORGANIZATION_ID,
      title: "Security Overview Report",
      type: ReportType.general,
      status: "generated",
      summary: "Overall security score 75/100 with active critical deception detection and one unresolved encryption gap.",
      findings: [
        "Public cloud analytics storage lacks encryption and KMS coverage.",
        "Legacy third-party token triggered a deception database alarm.",
        "Zero Trust denied or constrained high-risk export behaviors.",
      ],
      risks: [
        "Sensitive analytics datasets are exposed to elevated export risk.",
        "Legacy integration credentials remain a high-risk attack surface.",
      ],
      recommendedActions: [
        "Enable encryption and KMS on analytics storage.",
        "Keep legacy partner token isolated until remediation is completed.",
        "Expand playbook coverage for export anomaly scenarios.",
      ],
      relatedControls: ["RBAC/ABAC", "MFA", "Encryption", "SIEM", "Deception"],
      markdownContent: "# Security Overview Report\n\nPersisted foundation report for HCSC v2 seed.",
      snapshotJson: {
        securityScore: 75,
        criticalEvents: 2,
        complianceScore: 75,
        generatedAt: NOW.toISOString(),
      },
      generatedBy: "system-seed",
    },
  });

  const eventLinks = [
    "event_suspicious_export_01",
    "event_deception_triggered_01",
    "event_missing_encryption_01",
  ];

  for (const eventId of eventLinks) {
    await prisma.reportEventLink.upsert({
      where: {
        reportId_eventId: {
          reportId: "report_security_overview_seed_01",
          eventId,
        },
      },
      update: {},
      create: {
        reportId: "report_security_overview_seed_01",
        eventId,
      },
    });
  }

  const assetLinks = [
    "asset_public_analytics_bucket",
    "asset_private_customer_db_prod",
    "asset_private_finance_ledger",
  ];

  for (const assetId of assetLinks) {
    await prisma.reportAssetLink.upsert({
      where: {
        reportId_assetId: {
          reportId: "report_security_overview_seed_01",
          assetId,
        },
      },
      update: {},
      create: {
        reportId: "report_security_overview_seed_01",
        assetId,
      },
    });
  }
}

async function upsertAuditLogs() {
  const logs = [
    {
      id: "audit_login_success_seed",
      actorName: "Eyşan Yıldırım",
      actorRole: "Security Admin",
      action: "login_success",
      module: "Auth",
      target: "security.admin@hcsc.local",
      severity: AuditSeverity.info,
      result: AuditResult.success,
      ipAddress: "127.0.0.1",
      device: "Chrome on macOS",
      details: "Mock auth/session seed login success record.",
      userId: "user_security_admin",
    },
    {
      id: "audit_2fa_verified_seed",
      actorName: "Eyşan Yıldırım",
      actorRole: "Security Admin",
      action: "two_factor_verified",
      module: "Auth",
      target: "security.admin@hcsc.local",
      severity: AuditSeverity.info,
      result: AuditResult.success,
      ipAddress: "127.0.0.1",
      device: "Chrome on macOS",
      details: "Two-factor verification completed in seed.",
      userId: "user_security_admin",
    },
    {
      id: "audit_deception_triggered_seed",
      actorName: "Emir Demirtaş",
      actorRole: "Cloud Security Analyst",
      action: "deception_triggered",
      module: "Deception",
      target: "legacy-customer-db-shadow",
      severity: AuditSeverity.critical,
      result: AuditResult.success,
      ipAddress: "203.0.113.24",
      device: "legacy-partner-client/1.4",
      details: "Critical fake database deception trigger persisted by seed.",
      userId: "user_analyst",
    },
    {
      id: "audit_report_generated_seed",
      actorName: "Eyşan Yıldırım",
      actorRole: "Security Admin",
      action: "report_generated",
      module: "Reports",
      target: "Security Overview Report",
      severity: AuditSeverity.info,
      result: AuditResult.success,
      ipAddress: "127.0.0.1",
      device: "Chrome on macOS",
      details: "Persisted foundation report generated in seed.",
      userId: "user_security_admin",
    },
  ] as const;

  for (const log of logs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {
        ...log,
        organizationId: ORGANIZATION_ID,
      },
      create: {
        ...log,
        organizationId: ORGANIZATION_ID,
      },
    });
  }
}

async function upsertNotifications() {
  const notifications = [
    {
      id: "notification_deception_alarm_seed",
      userId: "user_security_admin",
      title: "Critical deception alarm",
      description: "legacy-customer-db-shadow trap generated a critical alert.",
      type: NotificationType.deception_alarm,
      severity: EventSeverity.critical,
      module: "Deception",
      actionHref: "/deception",
    },
    {
      id: "notification_report_ready_seed",
      userId: "user_analyst",
      title: "Report ready",
      description: "Security Overview Report was generated for the latest organization snapshot.",
      type: NotificationType.report_ready,
      severity: EventSeverity.low,
      module: "Reports",
      actionHref: "/reports",
    },
    {
      id: "notification_compliance_changed_seed",
      userId: "user_compliance",
      title: "Compliance snapshot updated",
      description: "Latest KVKK/GDPR/NIST snapshot was persisted for the organization.",
      type: NotificationType.compliance_changed,
      severity: EventSeverity.medium,
      module: "Compliance",
      actionHref: "/compliance",
    },
  ] as const;

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {
        ...notification,
        organizationId: ORGANIZATION_ID,
      },
      create: {
        ...notification,
        organizationId: ORGANIZATION_ID,
      },
    });
  }
}

async function upsertSimulationRun() {
  await prisma.simulationRun.upsert({
    where: { id: "simulation_run_executive_demo_seed" },
    update: {
      organizationId: ORGANIZATION_ID,
      scenarioId: "executive-demo-seed",
      summary: "Seeded executive demo baseline with export anomaly, deception alarm and report generation.",
      generatedEventIds: [
        "event_suspicious_export_01",
        "event_deception_triggered_01",
        "event_missing_encryption_01",
      ],
      generatedReportIds: ["report_security_overview_seed_01"],
      affectedModules: ["Dashboard", "Events", "Deception", "Reports", "Compliance"],
    },
    create: {
      id: "simulation_run_executive_demo_seed",
      organizationId: ORGANIZATION_ID,
      scenarioId: "executive-demo-seed",
      summary: "Seeded executive demo baseline with export anomaly, deception alarm and report generation.",
      generatedEventIds: [
        "event_suspicious_export_01",
        "event_deception_triggered_01",
        "event_missing_encryption_01",
      ],
      generatedReportIds: ["report_security_overview_seed_01"],
      affectedModules: ["Dashboard", "Events", "Deception", "Reports", "Compliance"],
    },
  });
}

async function main() {
  await upsertOrganization();
  await upsertUsers();
  await upsertSettings();
  await upsertAssets();
  await upsertIdentityProfiles();
  await upsertDeceptionAssets();
  await upsertAccessRequests();
  await upsertEvents();
  await upsertCompliance();
  await upsertReports();
  await upsertAuditLogs();
  await upsertNotifications();
  await upsertSimulationRun();

  console.log("HCSC v2 foundation seed completed.");
}

main()
  .catch((error) => {
    console.error("HCSC v2 foundation seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
