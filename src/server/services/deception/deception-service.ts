import type { DeceptionAssetType, EventSeverity } from "@prisma/client";

import { triggerDeceptionAccess } from "@/lib/deception-engine";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapDeceptionTriggerRecord } from "@/server/services/core/extra-mappers";
import { mapDeceptionAssetRecord as mapDeceptionAsset, mapIdentityRecord, mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
import { createNotification, notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

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
  const deceptionAsset = await prisma.deceptionAsset.findFirst({
    where: {
      id: input.deceptionAssetId,
      organizationId: input.organizationId,
    },
  });

  if (!deceptionAsset) {
    return null;
  }

  const identity =
    (input.identityProfileId
      ? await prisma.identityProfile.findFirst({
          where: {
            id: input.identityProfileId,
            organizationId: input.organizationId,
          },
        })
      : null) ??
    (await prisma.identityProfile.findFirst({
      where: { organizationId: input.organizationId },
      orderBy: [{ anomalyScore: "desc" }, { riskScore: "desc" }],
    }));

  if (!identity) {
    return null;
  }

  const simulated = triggerDeceptionAccess(
    mapDeceptionAsset(deceptionAsset),
    mapIdentityRecord(identity),
  );

  await prisma.identityProfile.update({
    where: { id: identity.id },
    data: {
      anomalyScore: simulated.updatedIdentity.anomalyScore,
      riskScore: simulated.updatedIdentity.riskScore,
      status: simulated.updatedIdentity.status,
      notes: simulated.updatedIdentity.notes,
      updatedAt: new Date(),
    },
  });

  const updatedDeception = await prisma.deceptionAsset.update({
    where: { id: deceptionAsset.id },
    data: {
      lureScore: simulated.updatedDeception.lureScore,
      triggerCount: simulated.updatedDeception.triggerCount,
      lastTriggeredAt: simulated.updatedDeception.lastTriggeredAt
        ? new Date(simulated.updatedDeception.lastTriggeredAt)
        : new Date(),
      status: "triggered",
      updatedAt: new Date(),
    },
  });

  const event = await prisma.securityEvent.create({
    data: {
      organizationId: input.organizationId,
      title: simulated.event.title,
      severity: simulated.event.severity,
      category: simulated.event.category,
      source: simulated.event.source,
      target: simulated.event.target,
      description: simulated.event.description,
      relatedControl: simulated.event.relatedControl,
      recommendation: simulated.event.recommendation,
      status: simulated.event.status,
      evidence: simulated.event.evidence,
      playbookActions: simulated.event.playbookActions,
      relatedIdentityId: identity.id,
      relatedDeceptionAssetId: deceptionAsset.id,
    },
  });

  await prisma.eventTimelineEntry.createMany({
    data: simulated.event.timeline.map((entry) => ({
      eventId: event.id,
      actor: entry.actor,
      message: entry.message,
    })),
  });

  await prisma.deceptionTrigger.create({
    data: {
      organizationId: input.organizationId,
      deceptionAssetId: deceptionAsset.id,
      identityProfileId: identity.id,
      eventId: event.id,
      sourceIp: input.actor.ipAddress,
      userAgent: input.actor.userAgent,
      requestHeaders: { simulated: true },
      requestPath: `/api/deception-assets/${deceptionAsset.id}/simulate-access`,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "deception_triggered",
    module: "Deception",
    target: deceptionAsset.name,
    severity: "critical",
    result: "success",
    details: `${identity.name} için güvenli deception simülasyonu çalıştırıldı.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await createNotification({
    organizationId: input.organizationId,
    title: "Deception triggered",
    description: simulated.recommendation.summary,
    type: "deception_alarm",
    severity: "critical",
    module: "Deception",
    actionHref: "/deception",
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Critical deception event",
    description: simulated.recommendation.summary,
    type: "deception_alarm",
    severity: "critical",
    module: "Deception",
    actionHref: "/events",
    roles: ["security_admin", "cloud_security_analyst"],
  });

  return {
    deceptionAsset: mapDeceptionAsset(updatedDeception),
    event: await prisma.securityEvent
      .findUnique({
        where: { id: event.id },
        include: {
          timelineEntries: {
            orderBy: { createdAt: "desc" },
          },
        },
      })
      .then((entry) => (entry ? mapSecurityEventRecord(entry) : null)),
  };
}
