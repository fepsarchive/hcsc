import type { DeceptionAssetType, EventSeverity } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapDeceptionTriggerRecord } from "@/server/services/core/extra-mappers";
import { mapDeceptionAssetRecord as mapDeceptionAsset } from "@/server/services/core/domain-mappers";
import { simulateDeceptionAccessWithEngine } from "@/server/services/engines/deception-engine.service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

export async function listDeceptionAssets(organizationId: string) {
  const assets = await prisma.deceptionAsset.findMany({
    where: { organizationId },
    orderBy: [{ triggerCount: "desc" }, { lureScore: "desc" }],
  });

  return assets.map(mapDeceptionAsset);
}

export async function createDeceptionAsset(input: {
  organizationId: string;
  name: string;
  location?: "deception";
  description: string;
  fakeType: DeceptionAssetType;
  mappedThreat: string;
  severity: EventSeverity;
  recommendedResponse: string;
  autoActions: string[];
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const created = await prisma.deceptionAsset.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      location: input.location ?? "deception",
      description: input.description,
      containsRealData: false,
      fakeType: input.fakeType,
      lureScore: 72,
      mappedThreat: input.mappedThreat,
      severity: input.severity,
      recommendedResponse: input.recommendedResponse,
      autoActions: input.autoActions,
      status: "active",
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "deception_asset_created",
    module: "Deception",
    target: created.name,
    severity: "info",
    result: "success",
    details: `${created.name} deception varlığı oluşturuldu.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return mapDeceptionAsset(created);
}

export async function listDeceptionTriggers(organizationId: string, deceptionAssetId: string) {
  const triggers = await prisma.deceptionTrigger.findMany({
    where: {
      organizationId,
      deceptionAssetId,
    },
    orderBy: { createdAt: "desc" },
  });

  return triggers.map(mapDeceptionTriggerRecord);
}

export async function simulateDeceptionAccess(input: {
  organizationId: string;
  deceptionAssetId: string;
  identityProfileId?: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const result = await simulateDeceptionAccessWithEngine({
    organizationId: input.organizationId,
    deceptionAssetId: input.deceptionAssetId,
    identityProfileId: input.identityProfileId,
    sourceIp: input.actor.ipAddress,
    userAgent: input.actor.userAgent,
    requestPath: `/api/deception-assets/${input.deceptionAssetId}/simulate-access`,
  });

  if (!result) {
    return null;
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "deception_triggered",
    module: "Deception",
    target: result.deceptionAsset.name,
    severity: "critical",
    result: "success",
    details: `${result.deceptionAsset.name} için güvenli deception simülasyonu çalıştırıldı.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      triggerId: result.triggerId,
      recommendation: result.recommendation.actions,
      identityStatus: result.identityStatus,
    },
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Critical deception event",
    description: result.recommendation.summary,
    type: "deception_alarm",
    severity: "critical",
    module: "Deception",
    actionHref: "/events",
    roles: ["security_admin", "cloud_security_analyst"],
  });

  return {
    deceptionAsset: result.deceptionAsset,
    event: result.event,
  };
}
