import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapAssetRecord } from "@/server/services/core/domain-mappers";
import { recalculateAssetRiskWithEngine } from "@/server/services/engines/risk-engine.service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

export async function listAssets(
  organizationId: string,
  filters: {
    search?: string;
    classification?: string;
    location?: string;
    riskLevel?: string;
    encrypted?: string;
    isDeception?: string;
  },
) {
  const assets = await prisma.asset.findMany({
    where: {
      organizationId,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { path: { contains: filters.search, mode: "insensitive" } },
              { owner: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.classification ? { classification: filters.classification as never } : {}),
      ...(filters.location ? { location: filters.location as never } : {}),
      ...(filters.riskLevel ? { riskLevel: filters.riskLevel as never } : {}),
      ...(filters.encrypted === "true" ? { encryptionEnabled: true } : {}),
      ...(filters.encrypted === "false" ? { encryptionEnabled: false } : {}),
      ...(filters.isDeception === "true" ? { isDeception: true } : {}),
      ...(filters.isDeception === "false" ? { isDeception: false } : {}),
    },
    orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
  });

  return assets.map(mapAssetRecord);
}

export async function getAsset(organizationId: string, assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      organizationId,
    },
  });

  return asset ? mapAssetRecord(asset) : null;
}

export async function recalculateAssetRisk(input: {
  organizationId: string;
  assetId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const recalculated = await recalculateAssetRiskWithEngine({
    organizationId: input.organizationId,
    assetId: input.assetId,
  });

  if (!recalculated) {
    return null;
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "asset_risk_recalculated",
    module: "Assets",
    target: recalculated.asset.name,
    severity: "info",
    result: "success",
    details: `${recalculated.asset.name} için risk skoru ${recalculated.asset.riskScore}/${recalculated.asset.riskLevel} olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      openCriticalEventCount: recalculated.metrics.openCriticalEventCount,
      deceptionTriggerCount: recalculated.metrics.deceptionTriggerCount,
    },
  });

  if (recalculated.asset.riskLevel === "high" || recalculated.asset.riskLevel === "critical") {
    await notifyOrganizationMembers({
      organizationId: input.organizationId,
      title: "High risk asset detected",
      description: `${recalculated.asset.name} varlığı ${recalculated.asset.riskLevel} risk seviyesine yükseldi.`,
      type: "critical_event",
      severity: recalculated.asset.riskLevel === "critical" ? "critical" : "high",
      module: "Assets",
      actionHref: "/assets",
      roles: ["security_admin", "cloud_security_analyst"],
    });
  }

  return mapAssetRecord(recalculated.asset);
}
