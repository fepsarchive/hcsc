import type { EventStatus, SoarAction } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
import { executePlaybookWithEngine, updateEventStatusWithEngine } from "@/server/services/engines/event-engine.service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

export async function listEvents(
  organizationId: string,
  filters: {
    severity?: string;
    status?: string;
    category?: string;
    search?: string;
  },
) {
  const events = await prisma.securityEvent.findMany({
    where: {
      organizationId,
      ...(filters.severity ? { severity: filters.severity as never } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.category ? { category: filters.category as never } : {}),
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
    orderBy: { createdAt: "desc" },
  });

  return events.map(mapSecurityEventRecord);
}

export async function getEvent(organizationId: string, eventId: string) {
  const event = await prisma.securityEvent.findFirst({
    where: {
      id: eventId,
      organizationId,
    },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return event ? mapSecurityEventRecord(event) : null;
}

export async function updateEventStatus(input: {
  organizationId: string;
  eventId: string;
  status: EventStatus;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const event = await prisma.securityEvent.findFirst({
    where: {
      id: input.eventId,
      organizationId: input.organizationId,
    },
  });

  if (!event) {
    return null;
  }

  const updated = await updateEventStatusWithEngine({
    organizationId: input.organizationId,
    eventId: input.eventId,
    status: input.status,
    actorName: input.actor.name,
  });

  if (!updated?.event) {
    return null;
  }

  if (updated.changed) {
    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.actor.userId,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      action: "event_status_updated",
      module: "Events",
      target: event.title,
      severity: event.severity === "critical" ? "critical" : event.severity === "high" ? "high" : "info",
      result: "success",
      details: `${event.title} için event status ${input.status} yapıldı.`,
      ipAddress: input.actor.ipAddress,
      device: input.actor.userAgent,
    });
  }

  return getEvent(input.organizationId, updated.event.id);
}

export async function executeEventPlaybook(input: {
  organizationId: string;
  eventId: string;
  action: SoarAction;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const event = await prisma.securityEvent.findFirst({
    where: {
      id: input.eventId,
      organizationId: input.organizationId,
    },
  });

  if (!event) {
    return null;
  }

  const result = await executePlaybookWithEngine({
    organizationId: input.organizationId,
    eventId: input.eventId,
    action: input.action,
    actorName: input.actor.name,
  });

  if (!result) {
    return null;
  }

  if (result.executionCreated) {
    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.actor.userId,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      action: "playbook_executed",
      module: "Events",
      target: event.title,
      severity: event.severity === "critical" ? "critical" : event.severity === "high" ? "high" : "info",
      result: "success",
      details: `${input.action} playbook aksiyonu çalıştırıldı.`,
      ipAddress: input.actor.ipAddress,
      device: input.actor.userAgent,
    });

    await notifyOrganizationMembers({
      organizationId: input.organizationId,
      title: "Playbook completed",
      description: `${event.title} için ${input.action} aksiyonu tamamlandı.`,
      type: "playbook_completed",
      severity: event.severity,
      module: "Events",
      actionHref: "/events",
      roles: ["security_admin", "cloud_security_analyst"],
    });
  }

  return getEvent(input.organizationId, event.id);
}
