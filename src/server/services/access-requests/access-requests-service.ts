import type { AccessAction, DeviceTrust, RequestStatus } from "@prisma/client";

import { createSecurityEvent } from "@/lib/event-engine";
import { evaluateZeroTrustRequest } from "@/lib/zero-trust-engine";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapAccessRequestRecord } from "@/server/services/core/domain-mappers";
import { createNotification, notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

function mapDecisionToStatus(decision: ReturnType<typeof evaluateZeroTrustRequest>["decision"]): RequestStatus {
  switch (decision) {
    case "allow":
      return "approved";
    case "limited_allow":
      return "approved";
    case "require_step_up_auth":
      return "step_up";
    case "deny":
      return "rejected";
    case "isolate":
      return "isolated";
  }
}

export async function listAccessRequests(organizationId: string) {
  const requests = await prisma.accessRequest.findMany({
    where: { organizationId },
    include: {
      identityProfile: true,
      asset: true,
    },
    orderBy: { requestedAt: "desc" },
  });

  return requests.map(mapAccessRequestRecord);
}

export async function createAccessRequest(input: {
  organizationId: string;
  identityProfileId: string;
  assetId: string;
  requestedAction: AccessAction;
  justification?: string;
  sourceLocation: "private_cloud" | "public_cloud" | "saas" | "backup" | "deception";
  sourceRegion: string;
  deviceTrust: DeviceTrust;
  mfa: boolean;
  anomalyScore: number;
  locationRisk: "low" | "medium" | "high";
  timeRisk: "normal" | "elevated" | "off_hours";
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const [identity, asset] = await Promise.all([
    prisma.identityProfile.findFirst({
      where: {
        id: input.identityProfileId,
        organizationId: input.organizationId,
      },
    }),
    prisma.asset.findFirst({
      where: {
        id: input.assetId,
        organizationId: input.organizationId,
      },
    }),
  ]);

  if (!identity || !asset) {
    return null;
  }

  const created = await prisma.accessRequest.create({
    data: {
      organizationId: input.organizationId,
      identityProfileId: identity.id,
      assetId: asset.id,
      requestedAction: input.requestedAction,
      justification: input.justification,
      sourceLocation: input.sourceLocation,
      sourceRegion: input.sourceRegion,
      deviceTrust: input.deviceTrust,
      mfa: input.mfa,
      anomalyScore: input.anomalyScore,
      locationRisk: input.locationRisk,
      timeRisk: input.timeRisk,
      decisionReasons: [],
      requiredActions: [],
      policyMatches: [],
      status: "pending",
    },
    include: {
      identityProfile: true,
      asset: true,
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "access_request_created",
    module: "Access Requests",
    target: `${identity.name} -> ${asset.name}`,
    severity: "info",
    result: "success",
    details: `${identity.name} için ${asset.name} erişim talebi oluşturuldu.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await createNotification({
    organizationId: input.organizationId,
    title: "Access request pending",
    description: `${identity.name} kullanıcısı için ${asset.name} erişim talebi oluşturuldu.`,
    type: "access_request_pending",
    severity: "medium",
    module: "Access Requests",
    actionHref: "/access-requests",
  });

  return mapAccessRequestRecord(created);
}

export async function evaluateAccessRequest(input: {
  organizationId: string;
  requestId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const request = await prisma.accessRequest.findFirst({
    where: {
      id: input.requestId,
      organizationId: input.organizationId,
    },
    include: {
      identityProfile: true,
      asset: true,
    },
  });

  if (!request) {
    return null;
  }

  const relatedCategories = await prisma.securityEvent.findMany({
    where: {
      organizationId: input.organizationId,
      OR: [{ relatedIdentityId: request.identityProfileId }, { source: request.identityProfile.name }],
    },
    select: {
      category: true,
    },
  });

  const evaluation = evaluateZeroTrustRequest(
    {
      identityType: request.identityProfile.type,
      mfa: request.mfa,
      deviceTrust: request.deviceTrust,
      requestedAction: request.requestedAction,
      locationRisk: request.locationRisk as "low" | "medium" | "high",
      timeRisk: request.timeRisk as "normal" | "elevated" | "off_hours",
      anomalyScore: request.anomalyScore,
    },
    {
      classification: request.asset.classification,
      location: request.asset.location,
      isDeception: request.asset.isDeception,
      name: request.asset.name,
    },
    {
      role: request.identityProfile.role,
      type: request.identityProfile.type,
      status: request.identityProfile.status,
      mfaEnabled: request.identityProfile.mfaEnabled,
    },
    {
      targetIsDeception: request.asset.isDeception,
      targetLocation: request.asset.location,
      recentEvents: relatedCategories.map((item) => item.category),
    },
  );

  const status = mapDecisionToStatus(evaluation.decision);

  const updated = await prisma.accessRequest.update({
    where: { id: request.id },
    data: {
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      status,
      decisionReasons: evaluation.reasons,
      requiredActions: evaluation.requiredActions,
      policyMatches: evaluation.policyMatches,
      decidedAt: new Date(),
    },
    include: {
      identityProfile: true,
      asset: true,
    },
  });

  let createdEventId: string | null = null;

  if (["require_step_up_auth", "deny", "isolate"].includes(evaluation.decision)) {
    const generatedEvent = createSecurityEvent({
      title: "Zero Trust decision event",
      severity:
        evaluation.decision === "isolate"
          ? "critical"
          : evaluation.decision === "deny"
            ? "high"
            : "medium",
      category: request.asset.isDeception ? "deception_triggered" : "policy_violation",
      source: request.identityProfile.name,
      target: request.asset.name,
      description: evaluation.reasons.join(" "),
      recommendation: evaluation.requiredActions.join(", "),
      relatedControl: "Zero Trust Policy Engine",
      relatedAssetId: request.asset.id,
      relatedIdentityId: request.identityProfile.id,
    });

    const event = await prisma.securityEvent.create({
      data: {
        organizationId: input.organizationId,
        title: generatedEvent.title,
        severity: generatedEvent.severity,
        category: generatedEvent.category,
        source: generatedEvent.source,
        target: generatedEvent.target,
        description: generatedEvent.description,
        relatedControl: generatedEvent.relatedControl,
        recommendation: generatedEvent.recommendation,
        status: generatedEvent.status,
        evidence: generatedEvent.evidence,
        playbookActions: generatedEvent.playbookActions,
        relatedAssetId: request.asset.id,
        relatedIdentityId: request.identityProfile.id,
        relatedAccessRequestId: request.id,
      },
    });

    createdEventId = event.id;

    await prisma.eventTimelineEntry.createMany({
      data: generatedEvent.timeline.map((entry) => ({
        eventId: event.id,
        actor: entry.actor,
        message: entry.message,
      })),
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "access_request_evaluated",
    module: "Access Requests",
    target: `${request.identityProfile.name} -> ${request.asset.name}`,
    severity: evaluation.decision === "isolate" ? "critical" : evaluation.decision === "deny" ? "high" : "info",
    result: "success",
    details: `${evaluation.decision} kararı üretildi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      decision: evaluation.decision,
      riskScore: evaluation.riskScore,
      eventId: createdEventId,
    },
  });

  if (createdEventId && (evaluation.decision === "isolate" || evaluation.decision === "deny")) {
    await notifyOrganizationMembers({
      organizationId: input.organizationId,
      title: "Critical access decision",
      description: `${request.identityProfile.name} için ${evaluation.decision} kararı üretildi.`,
      type: "critical_event",
      severity: evaluation.decision === "isolate" ? "critical" : "high",
      module: "Access Requests",
      actionHref: "/events",
      roles: ["security_admin", "cloud_security_analyst"],
    });
  }

  return mapAccessRequestRecord(updated);
}
