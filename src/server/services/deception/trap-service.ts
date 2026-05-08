import type { NextRequest } from "next/server";

import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractIpAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
}

function buildSafeHeaderSubset(request: NextRequest) {
  const acceptedHeaders = ["accept", "content-type", "user-agent", "x-forwarded-proto", "x-request-id", "referer"];

  return acceptedHeaders.reduce<Record<string, string>>((accumulator, headerName) => {
    const value = request.headers.get(headerName);

    if (value) {
      accumulator[headerName] = value.slice(0, 256);
    }

    return accumulator;
  }, {});
}

async function findTrapAsset(trapSlug: string) {
  const assets = await prisma.deceptionAsset.findMany({
    where: {
      containsRealData: false,
    },
  });

  const normalizedSlug = slugify(trapSlug);

  return (
    assets.find((asset) => asset.id === trapSlug) ??
    assets.find((asset) => asset.name === trapSlug) ??
    assets.find((asset) => slugify(asset.name) === normalizedSlug) ??
    null
  );
}

export async function triggerTrapForRequest(trapSlug: string, request: NextRequest) {
  const deceptionAsset = await findTrapAsset(trapSlug);

  if (!deceptionAsset || deceptionAsset.containsRealData) {
    return null;
  }

  const occurredAt = new Date();
  const requestPath = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent");
  const sourceIp = extractIpAddress(request);
  const safeHeaders = buildSafeHeaderSubset(request);

  const updatedDeceptionAsset = await prisma.deceptionAsset.update({
    where: { id: deceptionAsset.id },
    data: {
      triggerCount: {
        increment: 1,
      },
      lastTriggeredAt: occurredAt,
      status: "triggered",
      updatedAt: occurredAt,
    },
  });

  const event = await prisma.securityEvent.create({
    data: {
      organizationId: deceptionAsset.organizationId,
      title: `${deceptionAsset.name} trap endpoint probe`,
      severity: "critical",
      category: "deception_triggered",
      source: "Trap Endpoint",
      target: deceptionAsset.name,
      description:
        "Safe deception trap endpoint received an external probe. No real resource or secret was exposed.",
      relatedControl: "Active Defense / Trap Endpoint",
      recommendation:
        "Review source telemetry, correlate with existing events, and consider isolating related identities or tokens.",
      status: "open",
      evidence: {
        method: request.method,
        requestPath,
        sourceIp,
        observedAt: occurredAt.toISOString(),
        headerSubset: safeHeaders,
      },
      playbookActions: ["notify_security_team", "create_ticket", "require_mfa", "revoke_token"],
      relatedDeceptionAssetId: deceptionAsset.id,
    },
  });

  await prisma.eventTimelineEntry.createMany({
    data: [
      {
        eventId: event.id,
        actor: "Trap Endpoint",
        message: `Safe trap endpoint observed ${request.method} request for ${requestPath}.`,
      },
      {
        eventId: event.id,
        actor: "HCSC",
        message: "No real backend resource was accessed. Event recorded for safe investigation only.",
      },
    ],
  });

  const trigger = await prisma.deceptionTrigger.create({
    data: {
      organizationId: deceptionAsset.organizationId,
      deceptionAssetId: deceptionAsset.id,
      eventId: event.id,
      sourceIp,
      userAgent,
      requestHeaders: safeHeaders,
      requestPath,
    },
  });

  await createAuditLog({
    organizationId: deceptionAsset.organizationId,
    actorName: "Unknown External Probe",
    actorRole: "External Probe",
    action: "deception_triggered",
    module: "Trap Endpoint",
    target: updatedDeceptionAsset.name,
    severity: "critical",
    result: "success",
    details: `${updatedDeceptionAsset.name} için güvenli trap endpoint tetiklenmesi kaydedildi.`,
    ipAddress: sourceIp,
    device: userAgent,
    metadata: {
      triggerId: trigger.id,
      eventId: event.id,
      method: request.method,
      requestPath,
    },
  });

  await notifyOrganizationMembers({
    organizationId: deceptionAsset.organizationId,
    title: "Trap endpoint alarm",
    description: `${updatedDeceptionAsset.name} için güvenli trap endpoint probe kaydedildi.`,
    type: "deception_alarm",
    severity: "critical",
    module: "Trap Endpoint",
    actionHref: "/deception",
    roles: ["security_admin", "cloud_security_analyst"],
  });

  return {
    deceptionAssetId: updatedDeceptionAsset.id,
    eventId: event.id,
    triggerId: trigger.id,
  };
}
