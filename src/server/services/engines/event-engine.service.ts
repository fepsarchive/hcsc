import type { EventStatus, SoarAction } from "@prisma/client";

import { runSoarPlaybook } from "@/lib/event-engine";
import { prisma } from "@/server/db/prisma";
import { mapSecurityEventRecord } from "@/server/services/core/domain-mappers";

async function getHydratedEvent(organizationId: string, eventId: string) {
  return prisma.securityEvent.findFirst({
    where: {
      id: eventId,
      organizationId,
    },
    include: {
      relatedIdentity: true,
      timelineEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

async function appendTimelineIfChanged(input: {
  eventId: string;
  actor: string;
  message: string;
}) {
  const latest = await prisma.eventTimelineEntry.findFirst({
    where: { eventId: input.eventId },
    orderBy: { createdAt: "desc" },
  });

  if (latest?.actor === input.actor && latest.message === input.message) {
    return latest;
  }

  return prisma.eventTimelineEntry.create({
    data: {
      eventId: input.eventId,
      actor: input.actor,
      message: input.message,
    },
  });
}

export async function updateEventStatusWithEngine(input: {
  organizationId: string;
  eventId: string;
  status: EventStatus;
  actorName: string;
}) {
  const event = await getHydratedEvent(input.organizationId, input.eventId);
  if (!event) {
    return null;
  }

  if (event.status !== input.status) {
    await prisma.securityEvent.update({
      where: { id: event.id },
      data: {
        status: input.status,
        updatedAt: new Date(),
      },
    });

    await appendTimelineIfChanged({
      eventId: event.id,
      actor: input.actorName,
      message: `Event status ${input.status} olarak güncellendi.`,
    });
  }

  return {
    event: await getHydratedEvent(input.organizationId, input.eventId),
    changed: event.status !== input.status,
  };
}

export async function executePlaybookWithEngine(input: {
  organizationId: string;
  eventId: string;
  action: SoarAction;
  actorName: string;
}) {
  const event = await getHydratedEvent(input.organizationId, input.eventId);
  if (!event) {
    return null;
  }

  const existingExecution = await prisma.playbookExecution.findFirst({
    where: {
      organizationId: input.organizationId,
      eventId: event.id,
      action: input.action,
      status: "completed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingExecution) {
    return {
      event: mapSecurityEventRecord(event),
      executionCreated: false,
      updatedIdentity: false,
    };
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

  await appendTimelineIfChanged({
    eventId: event.id,
    actor: input.actorName,
    message: `${input.action} playbook aksiyonu çalıştırıldı.`,
  });

  let updatedIdentity = false;

  if (event.relatedIdentityId) {
    if (["isolate_identity", "account_lock"].includes(input.action)) {
      await prisma.identityProfile.update({
        where: { id: event.relatedIdentityId },
        data: {
          status: "isolated",
          updatedAt: new Date(),
        },
      });
      updatedIdentity = true;
    } else if (input.action === "revoke_token") {
      await prisma.identityProfile.update({
        where: { id: event.relatedIdentityId },
        data: {
          status: event.relatedIdentity?.status === "isolated" ? "isolated" : "suspicious",
          updatedAt: new Date(),
        },
      });
      updatedIdentity = true;
    } else if (input.action === "require_mfa") {
      await prisma.identityProfile.update({
        where: { id: event.relatedIdentityId },
        data: {
          mfaEnabled: true,
          updatedAt: new Date(),
        },
      });
      updatedIdentity = true;
    }
  }

  await prisma.playbookExecution.create({
    data: {
      organizationId: input.organizationId,
      eventId: event.id,
      action: input.action,
      status: "completed",
      summary: `${input.action} aksiyonu ${event.title} için başarıyla yürütüldü.`,
      executedBy: input.actorName,
    },
  });

  const refreshed = await getHydratedEvent(input.organizationId, input.eventId);

  return refreshed
    ? {
        event: mapSecurityEventRecord(refreshed),
        executionCreated: true,
        updatedIdentity,
      }
    : null;
}
