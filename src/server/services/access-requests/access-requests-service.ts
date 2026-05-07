import type { AccessAction, DeviceTrust } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapAccessRequestRecord } from "@/server/services/core/domain-mappers";
import { evaluateAccessRequestWithEngine } from "@/server/services/engines/zero-trust-engine.service";
import { createNotification, notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

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

  const evaluation = await evaluateAccessRequestWithEngine({
    organizationId: input.organizationId,
    requestId: input.requestId,
  });

  if (!evaluation) {
    return null;
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
      eventId: evaluation.relatedEventId,
    },
  });

  if (evaluation.createdHighRiskSignal) {
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

  return evaluation.request;
}
