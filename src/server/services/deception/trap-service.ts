import type { NextRequest } from "next/server";

import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { createSecurityEvent } from "@/server/security/security-event-service";

const TRAP_RATE_LIMIT_WINDOW_MS = 60_000;
const TRAP_RATE_LIMIT_MAX_REQUESTS = 30;
const trapRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isTrapRateLimited(input: { trapSlug: string; sourceIp: string | null }) {
  const now = Date.now();
  const key = `${input.trapSlug}:${input.sourceIp ?? "unknown"}`;
  const current = trapRateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    trapRateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + TRAP_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > TRAP_RATE_LIMIT_MAX_REQUESTS;
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

  if (isTrapRateLimited({ trapSlug, sourceIp })) {
    return null;
  }

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

  const event = await createSecurityEvent({
    organizationId: deceptionAsset.organizationId,
    title: `${deceptionAsset.name} trap endpoint probe`,
    severity: "critical",
    category: "trap_triggered",
    type: "TRAP_TRIGGERED",
    source: "Trap Endpoint",
    target: deceptionAsset.name,
    targetType: "deception_asset",
    targetId: deceptionAsset.id,
    description:
      "Safe deception trap endpoint received an external probe. No real resource or secret was exposed.",
    relatedControl: "Active Defense / Trap Endpoint",
    recommendation:
      "Review source telemetry, correlate with existing events, and consider isolating related identities or tokens.",
    status: "open",
    riskScore: 94,
    evidence: {
      method: request.method,
      requestPath,
      sourceIp,
      observedAt: occurredAt.toISOString(),
      headerSubset: safeHeaders,
    },
    metadata: {
      safeResponse: "404 Resource unavailable",
      containsRealData: false,
    },
    playbookActions: ["notify_security_team", "create_ticket", "require_mfa", "revoke_token"],
    relatedDeceptionAssetId: deceptionAsset.id,
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

  return {
    deceptionAssetId: updatedDeceptionAsset.id,
    eventId: event.id,
    triggerId: trigger.id,
  };
}
