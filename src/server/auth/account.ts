import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { hashPassword } from "@/server/auth/password";
import { createAuthAuditLog, createPendingSession } from "@/server/auth/session";
import { createTwoFactorEnrollmentSecret } from "@/server/auth/two-factor";
import { recalculateAndPersistCompliance } from "@/server/services/compliance/compliance-service";
import { createNotification, notifyOrganizationMembers } from "@/server/services/notifications/notification-service";
import { generateOrganizationReport } from "@/server/services/reports/reports-service";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function createUniqueOrganizationSlug(name: string) {
  const base = slugify(name) || "workspace";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}-${randomBytes(3).toString("hex")}`;
}

function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function provisionStarterWorkspace(organizationId: string) {
  const existingAssets = await prisma.asset.count({
    where: { organizationId },
  });

  if (existingAssets > 0) {
    return;
  }

  const assetIds = {
    registry: `${organizationId}_asset_customer_registry`,
    analytics: `${organizationId}_asset_analytics_lake`,
    audit: `${organizationId}_asset_identity_audit`,
  };

  const identityIds = {
    admin: `${organizationId}_identity_security_admin`,
    partner: `${organizationId}_identity_partner_token`,
  };

  const deceptionAssetId = `${organizationId}_deception_partner_token_decoy`;
  const accessRequestId = `${organizationId}_access_request_partner_review`;
  const eventId = `${organizationId}_event_partner_risk_review`;

  await prisma.asset.createMany({
    data: [
      {
        id: assetIds.registry,
        organizationId,
        name: "customer-registry",
        path: "private-cloud/customer-registry",
        dataType: "Customer Registry",
        location: "private_cloud",
        storageType: "database",
        classification: "critical",
        temperature: "hot",
        owner: "Data Governance",
        encryptionEnabled: true,
        kmsEnabled: true,
        backupEnabled: true,
        kvkkScope: true,
        gdprScope: true,
        privacyTags: ["PII", "KVKK", "GDPR"],
        retentionPolicy: "5 years",
        anonymizationStatus: "partial",
        lastAccessedAt: new Date(),
        accessCount24h: 24,
        accessIntensity: 42,
        riskScore: 72,
        riskLevel: "high",
        riskReasons: ["Critical data handling requires close monitoring."],
        recommendedControls: ["RBAC", "MFA", "DLP"],
        findings: ["Sensitive customer records should remain under strict access governance."],
        isDeception: false,
      },
      {
        id: assetIds.analytics,
        organizationId,
        name: "analytics-lake",
        path: "public-cloud/analytics-lake",
        dataType: "Analytics Lake",
        location: "public_cloud",
        storageType: "object_storage",
        classification: "sensitive",
        temperature: "warm",
        owner: "Business Intelligence",
        encryptionEnabled: true,
        kmsEnabled: false,
        backupEnabled: true,
        kvkkScope: false,
        gdprScope: true,
        privacyTags: ["Analytics", "GDPR"],
        retentionPolicy: "18 months",
        anonymizationStatus: "partial",
        lastAccessedAt: new Date(),
        accessCount24h: 16,
        accessIntensity: 26,
        riskScore: 58,
        riskLevel: "medium",
        riskReasons: ["Public cloud analytics workloads need continuous visibility."],
        recommendedControls: ["CSPM", "KMS", "Alerting"],
        findings: ["Managed keys should be enabled for analytics exports."],
        isDeception: false,
      },
      {
        id: assetIds.audit,
        organizationId,
        name: "identity-audit-stream",
        path: "private-cloud/identity-audit-stream",
        dataType: "Identity Audit Stream",
        location: "private_cloud",
        storageType: "file_share",
        classification: "confidential",
        temperature: "warm",
        owner: "Identity Governance",
        encryptionEnabled: true,
        kmsEnabled: true,
        backupEnabled: true,
        kvkkScope: false,
        gdprScope: false,
        privacyTags: ["Audit", "Identity"],
        retentionPolicy: "24 months",
        anonymizationStatus: "not_applicable",
        lastAccessedAt: new Date(),
        accessCount24h: 9,
        accessIntensity: 12,
        riskScore: 36,
        riskLevel: "medium",
        riskReasons: ["Operational audit trail should remain immutable."],
        recommendedControls: ["Integrity monitoring", "Retention review"],
        findings: ["Review retention exceptions quarterly."],
        isDeception: false,
      },
    ],
  });

  await prisma.identityProfile.createMany({
    data: [
      {
        id: identityIds.admin,
        organizationId,
        name: "security.owner",
        type: "user",
        role: "Security Owner",
        department: "Security",
        homeLocation: "private_cloud",
        region: "TR-IST",
        mfaEnabled: true,
        deviceTrust: "trusted",
        anomalyScore: 8,
        riskScore: 18,
        status: "active",
        lastSeenAt: new Date(),
        notes: ["Starter workspace administrator."],
        accessVolume24h: 12,
        tags: ["owner", "security"],
      },
      {
        id: identityIds.partner,
        organizationId,
        name: "partner-ingestion-token",
        type: "third_party",
        role: "Partner Ingestion Token",
        department: "Integrations",
        homeLocation: "public_cloud",
        region: "EU-WEST",
        mfaEnabled: false,
        deviceTrust: "unknown",
        anomalyScore: 44,
        riskScore: 57,
        status: "watchlist",
        lastSeenAt: new Date(),
        notes: ["Starter external integration profile."],
        accessVolume24h: 21,
        tags: ["integration", "external"],
      },
    ],
  });

  await prisma.deceptionAsset.create({
    data: {
      id: deceptionAssetId,
      organizationId,
      name: "partner-token-decoy",
      location: "deception",
      description: "Non-production token vault decoy for early warning telemetry.",
      containsRealData: false,
      fakeType: "token_store",
      lureScore: 88,
      triggerCount: 0,
      mappedThreat: "Credential Theft",
      severity: "high",
      recommendedResponse: "require_mfa, revoke_token, create_ticket",
      autoActions: ["require_mfa", "revoke_token", "create_ticket"],
      status: "active",
    },
  });

  await prisma.accessRequest.create({
    data: {
      id: accessRequestId,
      organizationId,
      identityProfileId: identityIds.partner,
      assetId: assetIds.analytics,
      requestedAction: "read",
      justification: "Starter analytics integration validation",
      sourceLocation: "public_cloud",
      sourceRegion: "EU-WEST",
      deviceTrust: "unknown",
      mfa: false,
      anomalyScore: 44,
      locationRisk: "medium",
      timeRisk: "elevated",
      decision: "require_step_up_auth",
      riskScore: 63,
      status: "step_up",
      decisionReasons: ["External integration token requires additional review."],
      requiredActions: ["require_mfa", "manager_approval"],
      policyMatches: ["ZT-EXT-001"],
      requestedAt: new Date(),
      decidedAt: new Date(),
    },
  });

  await prisma.securityEvent.create({
    data: {
      id: eventId,
      organizationId,
      title: "Starter workspace external access review",
      severity: "high",
      category: "third_party_anomaly",
      source: "Starter Provisioning",
      target: "partner-ingestion-token",
      description: "Initial workspace posture includes a watchlisted external integration for review workflows.",
      relatedControl: "Zero Trust",
      recommendation: "Review external token policy and confirm least privilege access.",
      status: "investigating",
      evidence: { identityProfileId: identityIds.partner, assetId: assetIds.analytics },
      playbookActions: ["require_mfa", "notify_security_team"],
      relatedAssetId: assetIds.analytics,
      relatedIdentityId: identityIds.partner,
      relatedAccessRequestId: accessRequestId,
    },
  });

  await prisma.eventTimelineEntry.createMany({
    data: [
      {
        eventId,
        actor: "Starter Provisioning",
        message: "Workspace baseline generated with controlled third-party review scenario.",
      },
      {
        eventId,
        actor: "Policy Engine",
        message: "Step-up authentication recommended for external integration access.",
      },
    ],
  });
}

export async function registerWorkspaceAccount(input: {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return {
      success: false as const,
      code: "EMAIL_TAKEN",
      message: "Bu e-posta ile kayıtlı bir hesap zaten var.",
    };
  }

  const slug = await createUniqueOrganizationSlug(input.companyName);
  const rawToken = randomBytes(32).toString("hex");
  const twoFactorSecret = createTwoFactorEnrollmentSecret();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.companyName.trim(),
          slug,
          plan: "Starter Workspace",
          region: "Kurulum bekleniyor",
          cloudMode: "hybrid_cloud",
          complianceFrameworks: [],
          demoMode: false,
          onboardingCompleted: false,
        },
      });

      const user = await tx.user.create({
        data: {
          name: input.fullName.trim(),
          email,
          passwordHash: hashPassword(input.password),
          role: "security_admin",
          department: "Security Operations",
          avatarInitials: input.fullName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join(""),
          status: "active",
          mfaEnabled: false,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "security_admin",
        },
      });

      await tx.twoFactorSecret.create({
        data: {
          userId: user.id,
          secret: twoFactorSecret.secret,
          issuer: "Hybrid Cloud Security Console",
          label: user.email,
        },
      });

      await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
          region: organization.region,
          cloudMode: organization.cloudMode,
          complianceFrameworks: [],
        },
      });

      await tx.riskPolicy.create({
        data: {
          organizationId: organization.id,
          criticalClassificationWeight: 24,
          missingEncryptionWeight: 18,
          publicCloudSensitiveWeight: 16,
          missingBackupWeight: 10,
          noKmsWeight: 12,
          openCriticalEventWeight: 14,
          deceptionTriggerWeight: 20,
        },
      });

      await tx.reportBranding.create({
        data: {
          organizationId: organization.id,
          companyName: organization.name,
          reportFooter: "Generated by Hybrid Cloud Security Console",
          preparedByLabel: "Prepared by HCSC",
          confidentialityLabel: "Internal / Confidential",
        },
      });

      const { session } = await createPendingSession({
        userId: user.id,
        organizationId: organization.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        client: tx,
        rawToken,
      });

      return {
        organization,
        user,
        session,
      };
    });

    await createAuthAuditLog({
      organizationId: created.organization.id,
      userId: created.user.id,
      actorName: created.user.name,
      actorRole: mapDbUserToAppUser(created.user).role,
      action: "registration_completed",
      target: created.user.email,
      severity: "info",
      result: "success",
      details: "Yeni kullanıcı ve çalışma alanı oluşturuldu, 2FA doğrulaması bekleniyor.",
      ipAddress: input.ipAddress,
      device: input.userAgent,
    });

    return {
      success: true as const,
      rawToken,
      session: created.session,
      user: mapDbUserToAppUser(created.user),
      organization: mapOrganizationToProfile(created.organization),
      onboardingCompleted: created.organization.onboardingCompleted,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false as const,
        code: "EMAIL_TAKEN",
        message: "Bu e-posta ile kayıtlı bir hesap zaten var.",
      };
    }

    throw error;
  }
}

export async function createPasswordResetRequest(input: {
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  appOrigin?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user || !user.memberships[0]) {
    return {
      success: true as const,
      message: "Eğer bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderilecektir.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      OR: [
        { usedAt: null },
        { expiresAt: { lt: new Date() } },
      ],
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await createAuthAuditLog({
    organizationId: user.memberships[0].organizationId,
    userId: user.id,
    actorName: user.name,
    actorRole: mapDbUserToAppUser(user).role,
    action: "password_reset_requested",
    target: user.email,
    severity: "info",
    result: "success",
    details: "Şifre sıfırlama bağlantısı oluşturuldu.",
    ipAddress: input.ipAddress,
    device: input.userAgent,
  });

  await createNotification({
    organizationId: user.memberships[0].organizationId,
    userId: user.id,
    title: "Şifre sıfırlama talebi",
    description: "Hesabın için yeni bir şifre sıfırlama talebi oluşturuldu.",
    type: "access_request_pending",
    severity: "medium",
    module: "Authentication",
    actionHref: "/login",
  });

  const resetUrl =
    input.appOrigin && process.env.NODE_ENV !== "production"
      ? `${input.appOrigin}/reset-password?token=${token}`
      : null;

  return {
    success: true as const,
    message: "Eğer bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderilecektir.",
    resetUrl,
  };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const tokenHash = hashOpaqueToken(input.token.trim());
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
            },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
    return {
      success: false as const,
      code: "INVALID_RESET_TOKEN",
      message: "Şifre yenileme bağlantısı geçersiz veya süresi dolmuş.",
    };
  }

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash: hashPassword(input.password),
      },
    }),
    prisma.session.updateMany({
      where: {
        userId: resetToken.userId,
        status: {
          in: ["pending_2fa", "active"],
        },
      },
      data: {
        status: "revoked",
        updatedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        id: {
          not: resetToken.id,
        },
      },
    }),
  ]);

  const membership = resetToken.user.memberships[0];

  if (membership) {
    await createAuthAuditLog({
      organizationId: membership.organizationId,
      userId: resetToken.userId,
      actorName: resetToken.user.name,
      actorRole: mapDbUserToAppUser(resetToken.user).role,
      action: "password_reset_completed",
      target: resetToken.user.email,
      severity: "info",
      result: "success",
      details: "Kullanıcı parolası güvenli şekilde yenilendi ve mevcut oturumlar kapatıldı.",
      ipAddress: input.ipAddress,
      device: input.userAgent,
    });
  }

  return {
    success: true as const,
  };
}

export async function completeWorkspaceOnboarding(input: {
  organizationId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  data: {
    organizationName: string;
    city?: string;
    usageType?: string;
    defaultCurrency?: string;
    cloudMode: "private_cloud" | "public_cloud" | "hybrid_cloud";
    complianceFrameworks: string[];
    seedStarterData: boolean;
    runInitialScan: boolean;
  };
}) {
  const organization = await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      name: input.data.organizationName.trim(),
      region: input.data.city?.trim() || "Türkiye / EU",
      cloudMode: input.data.cloudMode,
      complianceFrameworks: input.data.complianceFrameworks,
      onboardingCompleted: true,
      updatedAt: new Date(),
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organizationId: input.organizationId },
    update: {
      region: input.data.city?.trim() || organization.region,
      cloudMode: input.data.cloudMode,
      complianceFrameworks: input.data.complianceFrameworks,
      usageType: input.data.usageType ?? null,
      defaultCurrency: input.data.defaultCurrency ?? null,
      setupCompletedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      organizationId: input.organizationId,
      region: input.data.city?.trim() || organization.region,
      cloudMode: input.data.cloudMode,
      complianceFrameworks: input.data.complianceFrameworks,
      usageType: input.data.usageType ?? null,
      defaultCurrency: input.data.defaultCurrency ?? null,
      setupCompletedAt: new Date(),
    },
  });

  await prisma.reportBranding.updateMany({
    where: { organizationId: input.organizationId },
    data: {
      companyName: input.data.organizationName.trim(),
      updatedAt: new Date(),
    },
  });

  if (input.data.seedStarterData) {
    await provisionStarterWorkspace(input.organizationId);
  }

  if (input.data.runInitialScan) {
    await recalculateAndPersistCompliance({
      organizationId: input.organizationId,
      actor: input.actor,
    }).catch(() => null);

    const assetCount = await prisma.asset.count({
      where: { organizationId: input.organizationId },
    });

    if (assetCount > 0) {
      await generateOrganizationReport({
        organizationId: input.organizationId,
        type: "security_posture",
        actor: input.actor,
      }).catch(() => null);
    }
  }

  await createAuthAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "onboarding_completed",
    target: input.data.organizationName.trim(),
    severity: "info",
    result: "success",
    details: `Kurulum ${input.data.cloudMode} çalışma alanı ve ${input.data.complianceFrameworks.join(", ")} kapsamıyla tamamlandı.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      usageType: input.data.usageType ?? null,
      defaultCurrency: input.data.defaultCurrency ?? null,
      seedStarterData: input.data.seedStarterData,
      runInitialScan: input.data.runInitialScan,
    },
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Workspace ready",
    description: "İlk kurulum tamamlandı ve çalışma alanı kullanıma hazır.",
    type: "simulation_completed",
    severity: "low",
    module: "Onboarding",
    actionHref: "/dashboard",
    roles: ["security_admin", "cloud_security_analyst", "compliance_officer", "executive"],
  });

  return {
    organization: mapOrganizationToProfile(organization),
    onboardingCompleted: true,
  };
}
