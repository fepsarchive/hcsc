import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapOrganizationToProfile } from "@/server/auth/permissions";

export async function getSettingsBundle(organizationId: string) {
  const [organization, settings, riskPolicy, reportBranding] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.organizationSettings.findUnique({ where: { organizationId } }),
    prisma.riskPolicy.findUnique({ where: { organizationId } }),
    prisma.reportBranding.findUnique({ where: { organizationId } }),
  ]);

  if (!organization) {
    return null;
  }

  return {
    organization: mapOrganizationToProfile(organization),
    organizationSettings: settings,
    riskPolicy,
    reportBranding,
  };
}

export async function updateRiskPolicy(input: {
  organizationId: string;
  data: {
    criticalClassificationWeight?: number;
    missingEncryptionWeight?: number;
    publicCloudSensitiveWeight?: number;
    missingBackupWeight?: number;
    noKmsWeight?: number;
    openCriticalEventWeight?: number;
    deceptionTriggerWeight?: number;
  };
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const updated = await prisma.riskPolicy.update({
    where: { organizationId: input.organizationId },
    data: {
      ...input.data,
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "settings_updated",
    module: "Settings",
    target: "risk-policy",
    severity: "info",
    result: "success",
    details: "Risk policy güncellendi.",
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return updated;
}

export async function updateReportBranding(input: {
  organizationId: string;
  data: {
    companyName?: string;
    reportFooter?: string;
    preparedByLabel?: string;
    confidentialityLabel?: string;
  };
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const updated = await prisma.reportBranding.update({
    where: { organizationId: input.organizationId },
    data: {
      ...input.data,
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "settings_updated",
    module: "Settings",
    target: "report-branding",
    severity: "info",
    result: "success",
    details: "Report branding güncellendi.",
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return updated;
}

export async function updateOrganizationSettings(input: {
  organizationId: string;
  data: {
    name?: string;
    plan?: string;
    region?: string;
    cloudMode?: "private_cloud" | "public_cloud" | "hybrid_cloud";
    complianceFrameworks?: string[];
  };
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const [organization, settings] = await Promise.all([
    prisma.organization.update({
      where: { id: input.organizationId },
      data: {
        ...(input.data.name ? { name: input.data.name } : {}),
        ...(input.data.plan ? { plan: input.data.plan } : {}),
        ...(input.data.region ? { region: input.data.region } : {}),
        ...(input.data.cloudMode ? { cloudMode: input.data.cloudMode } : {}),
        ...(input.data.complianceFrameworks ? { complianceFrameworks: input.data.complianceFrameworks } : {}),
        updatedAt: new Date(),
      },
    }),
    prisma.organizationSettings.update({
      where: { organizationId: input.organizationId },
      data: {
        ...(input.data.region ? { region: input.data.region } : {}),
        ...(input.data.cloudMode ? { cloudMode: input.data.cloudMode } : {}),
        ...(input.data.complianceFrameworks ? { complianceFrameworks: input.data.complianceFrameworks } : {}),
        updatedAt: new Date(),
      },
    }),
  ]);

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "settings_updated",
    module: "Settings",
    target: organization.name,
    severity: "info",
    result: "success",
    details: "Organization ayarları güncellendi.",
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return {
    organization,
    organizationSettings: settings,
  };
}
