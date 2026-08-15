import "server-only";

import type { EventCategory, EventSeverity, EventStatus, SecurityEvent } from "@prisma/client";

import { sanitizeSecurityMetadata } from "@/lib/security-metadata";
import { prisma } from "@/server/db/prisma";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";
import { calculateEventRisk } from "@/server/security/risk-scoring-service";
import { dispatchIntegrationEvent } from "@/server/integrations/integration-endpoint-service";

export { sanitizeSecurityMetadata } from "@/lib/security-metadata";

function shouldNotify(severity: EventSeverity, riskScore: number) {
  return severity === "critical" || severity === "high" || riskScore >= 70;
}

function mapNotificationType(category: EventCategory) {
  if (category === "trap_triggered" || category === "deception_triggered") return "deception_alarm" as const;
  if (category === "compliance_gap") return "compliance_changed" as const;
  if (category === "report_generated") return "report_ready" as const;
  return "critical_event" as const;
}

export async function createSecurityEvent(input: {
  organizationId: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  source: string;
  category: EventCategory;
  type?: string | null;
  title: string;
  description: string;
  severity: EventSeverity;
  status?: EventStatus;
  riskScore?: number;
  target?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  evidence?: unknown;
  relatedControl?: string | null;
  recommendation?: string | null;
  relatedAssetId?: string | null;
  relatedIdentityId?: string | null;
  relatedAccessRequestId?: string | null;
  relatedDeceptionAssetId?: string | null;
  playbookActions?: string[];
  notify?: boolean;
}) {
  const risk =
    typeof input.riskScore === "number"
      ? {
          score: Math.max(0, Math.min(100, Math.round(input.riskScore))),
          reasons: ["Explicit event risk score supplied."],
        }
      : calculateEventRisk({
          severity: input.severity,
          category: input.category,
          targetType: input.targetType,
          metadata: sanitizeSecurityMetadata(input.metadata),
        });

  const event = await prisma.securityEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      source: input.source,
      category: input.category,
      eventType: input.type ?? input.category,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: input.status ?? "open",
      riskScore: risk.score,
      target: input.target ?? input.targetId ?? input.targetType ?? "unknown",
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata === undefined ? undefined : sanitizeSecurityMetadata(input.metadata),
      evidence: input.evidence === undefined ? [] : sanitizeSecurityMetadata(input.evidence),
      relatedControl: input.relatedControl ?? null,
      recommendation: input.recommendation ?? null,
      relatedAssetId: input.relatedAssetId ?? null,
      relatedIdentityId: input.relatedIdentityId ?? null,
      relatedAccessRequestId: input.relatedAccessRequestId ?? null,
      relatedDeceptionAssetId: input.relatedDeceptionAssetId ?? null,
      playbookActions: input.playbookActions ?? [],
    },
  });

  if ((input.notify ?? true) && shouldNotify(input.severity, risk.score)) {
    await notifyOrganizationMembers({
      organizationId: input.organizationId,
      title: event.title,
      description: event.description,
      type: mapNotificationType(input.category),
      severity: input.severity,
      module: "Security",
      actionHref: "/events",
      roles: ["security_admin", "cloud_security_analyst"],
      metadata: {
        eventId: event.id,
        category: event.category,
        riskScore: event.riskScore,
      },
    });
  }

  await dispatchIntegrationEvent(input.organizationId, "security_event", {
    id: event.id,
    category: event.category,
    severity: event.severity,
    status: event.status,
    riskScore: event.riskScore,
    title: event.title,
    description: event.description,
    target: event.target,
    createdAt: event.createdAt.toISOString(),
  }).catch(() => []);

  if (event.category === "report_generated") {
    await dispatchIntegrationEvent(input.organizationId, "report_ready", {
      eventId: event.id,
      title: event.title,
      target: event.target,
      createdAt: event.createdAt.toISOString(),
    }).catch(() => []);
  }

  return event;
}

export async function listSecurityEvents(filters: {
  organizationId: string;
  severity?: EventSeverity;
  status?: EventStatus;
  category?: EventCategory;
  search?: string;
  take?: number;
}) {
  return prisma.securityEvent.findMany({
    where: {
      organizationId: filters.organizationId,
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { source: { contains: filters.search, mode: "insensitive" } },
              { target: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 100,
  });
}

export async function getSecurityEventById(organizationId: string, id: string) {
  return prisma.securityEvent.findFirst({
    where: { id, organizationId },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateSecurityEventStatus(input: {
  organizationId: string;
  id: string;
  status: EventStatus;
}) {
  const event = await prisma.securityEvent.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
  });

  if (!event) return null;

  return prisma.securityEvent.update({
    where: { id: event.id },
    data: {
      status: input.status,
      resolvedAt: input.status === "resolved" || input.status === "false_positive" ? new Date() : null,
      updatedAt: new Date(),
    },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getSecurityEventMetrics(organizationId: string) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [total, openCritical, severityGroups, statusGroups, recentUnauthorizedAttempts, recentTrapTriggers, averageRisk] =
    await Promise.all([
      prisma.securityEvent.count({ where: { organizationId } }),
      prisma.securityEvent.count({ where: { organizationId, severity: "critical", status: { in: ["open", "investigating", "contained"] } } }),
      prisma.securityEvent.groupBy({ by: ["severity"], where: { organizationId }, _count: { _all: true } }),
      prisma.securityEvent.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
      prisma.securityEvent.count({
        where: {
          organizationId,
          category: { in: ["admin_access_denied", "unauthorized_access_attempt"] },
          createdAt: { gte: since24h },
        },
      }),
      prisma.securityEvent.count({
        where: {
          organizationId,
          category: { in: ["trap_triggered", "deception_triggered"] },
          createdAt: { gte: since24h },
        },
      }),
      prisma.securityEvent.aggregate({
        where: { organizationId },
        _avg: { riskScore: true },
      }),
    ]);

  return {
    total,
    openCritical,
    severityDistribution: Object.fromEntries(severityGroups.map((entry) => [entry.severity, entry._count._all])),
    statusDistribution: Object.fromEntries(statusGroups.map((entry) => [entry.status, entry._count._all])),
    recentUnauthorizedAttempts,
    recentTrapTriggers,
    averageRiskScore: Math.round(averageRisk._avg.riskScore ?? 0),
  };
}

export async function getRecentCriticalEvents(organizationId: string, take = 6) {
  return prisma.securityEvent.findMany({
    where: {
      organizationId,
      severity: { in: ["critical", "high"] },
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
}

export async function getEventTimeline(organizationId: string) {
  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const events = await prisma.securityEvent.findMany({
    where: { organizationId, createdAt: { gte: since } },
    select: { createdAt: true, severity: true },
    orderBy: { createdAt: "asc" },
  });

  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().slice(0, 10);
  });
  const timeline = new Map(labels.map((label) => [label, { date: label, total: 0, critical: 0, high: 0 }]));

  for (const event of events) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const bucket = timeline.get(key);
    if (!bucket) continue;
    bucket.total += 1;
    if (event.severity === "critical") bucket.critical += 1;
    if (event.severity === "high") bucket.high += 1;
  }

  return Array.from(timeline.values());
}

export function isHighRiskEvent(event: Pick<SecurityEvent, "severity" | "riskScore">) {
  return shouldNotify(event.severity, event.riskScore);
}
