import type { EventStatus, SoarAction } from "@prisma/client";

import { runSoarPlaybook } from "@/lib/event-engine";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
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

  const updated = await prisma.securityEvent.update({
    where: { id: event.id },
    data: {
      status: input.status,
      updatedAt: new Date(),
    },
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  await prisma.eventTimelineEntry.create({
    data: {
      eventId: event.id,
      actor: input.actor.name,
      message: `Event status ${input.status} olarak güncellendi.`,
    },
  });

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

  return getEvent(input.organizationId, updated.id);
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
    include: {
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) {
    return null;
  }

  const updatedView = runSoarPlaybook(mapSecurityEventRecord(event), input.action);

  await prisma.securityEvent.update({
    where: { id: event.id },
    data: {
      status: updatedView.status,
      recommendation: updatedView.recommendation,
      updatedAt: new Date(),
    },
  });

  await prisma.eventTimelineEntry.create({
    data: {
      eventId: event.id,
      actor: input.actor.name,
      message: `${input.action} playbook aksiyonu çalıştırıldı.`,
    },
  });

  await prisma.playbookExecution.create({
    data: {
      organizationId: input.organizationId,
      eventId: event.id,
      action: input.action,
      status: "completed",
      summary: `${input.action} aksiyonu ${event.title} için başarıyla yürütüldü.`,
      executedBy: input.actor.name,
    },
  });

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

  return getEvent(input.organizationId, event.id);
}
