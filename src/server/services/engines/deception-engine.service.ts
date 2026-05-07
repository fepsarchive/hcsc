import { triggerDeceptionAccess } from "@/lib/deception-engine";
import { prisma } from "@/server/db/prisma";
import { mapDeceptionAssetRecord, mapIdentityRecord, mapSecurityEventRecord } from "@/server/services/core/domain-mappers";

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export async function simulateDeceptionAccessWithEngine(input: {
  organizationId: string;
  deceptionAssetId: string;
  identityProfileId?: string;
  sourceIp?: string | null;
  userAgent?: string | null;
  requestPath?: string | null;
}) {
  const deceptionAsset = await prisma.deceptionAsset.findFirst({
    where: {
      id: input.deceptionAssetId,
      organizationId: input.organizationId,
    },
  });

  if (!deceptionAsset || deceptionAsset.containsRealData) {
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
    mapDeceptionAssetRecord(deceptionAsset),
    mapIdentityRecord(identity),
  );

  const note = simulated.updatedIdentity.notes[0] ?? `${deceptionAsset.name} deception varlığı tetiklendi.`;
  const existingNotes = Array.isArray(identity.notes)
    ? identity.notes.map((entry) => String(entry))
    : [];

  await prisma.identityProfile.update({
    where: { id: identity.id },
    data: {
      anomalyScore: simulated.updatedIdentity.anomalyScore,
      riskScore: simulated.updatedIdentity.riskScore,
      status: simulated.updatedIdentity.status,
      notes: unique([note, ...existingNotes]),
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

  const trigger = await prisma.deceptionTrigger.create({
    data: {
      organizationId: input.organizationId,
      deceptionAssetId: deceptionAsset.id,
      identityProfileId: identity.id,
      eventId: event.id,
      sourceIp: input.sourceIp,
      userAgent: input.userAgent,
      requestHeaders: { simulated: true },
      requestPath: input.requestPath ?? `/api/deception-assets/${deceptionAsset.id}/simulate-access`,
    },
  });

  const fullEvent = await prisma.securityEvent.findUnique({
    where: { id: event.id },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return {
    deceptionAsset: mapDeceptionAssetRecord(updatedDeception),
    event: fullEvent ? mapSecurityEventRecord(fullEvent) : null,
    triggerId: trigger.id,
    recommendation: simulated.recommendation,
    identityStatus: simulated.updatedIdentity.status,
  };
}
