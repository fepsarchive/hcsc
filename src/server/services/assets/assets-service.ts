import { calculateAssetRisk } from "@/lib/risk-engine";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapAssetRecord, mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
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
  const asset = await prisma.asset.findFirst({
    where: {
      id: input.assetId,
      organizationId: input.organizationId,
    },
  });

  if (!asset) {
    return null;
  }

  const relatedEvents = await prisma.securityEvent.findMany({
    where: {
      organizationId: input.organizationId,
      OR: [{ relatedAssetId: asset.id }, { target: { contains: asset.name, mode: "insensitive" } }],
    },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const calculated = calculateAssetRisk(
    mapAssetRecord(asset),
    relatedEvents.map(mapSecurityEventRecord),
  );

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      riskScore: calculated.score,
      riskLevel: calculated.level,
      riskReasons: calculated.reasons,
      recommendedControls: calculated.recommendedControls,
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "asset_risk_recalculated",
    module: "Assets",
    target: updated.name,
    severity: "info",
    result: "success",
    details: `${updated.name} için risk skoru ${calculated.score}/${calculated.level} olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  if (calculated.level === "high" || calculated.level === "critical") {
    await notifyOrganizationMembers({
      organizationId: input.organizationId,
      title: "High risk asset detected",
      description: `${updated.name} varlığı ${calculated.level} risk seviyesine yükseldi.`,
      type: "critical_event",
      severity: calculated.level === "critical" ? "critical" : "high",
      module: "Assets",
      actionHref: "/assets",
      roles: ["security_admin", "cloud_security_analyst"],
    });
  }

  return mapAssetRecord(updated);
}
