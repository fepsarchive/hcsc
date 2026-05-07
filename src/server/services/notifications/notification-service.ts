import type { EventSeverity, NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

function buildNotificationPayload(input: {
  organizationId: string;
  userId?: string | null;
  title: string;
  description: string;
  type: NotificationType;
  severity: EventSeverity;
  module: string;
  actionHref?: string | null;
}) {
  return {
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    title: input.title,
    description: input.description,
    type: input.type,
    severity: input.severity,
    module: input.module,
    actionHref: input.actionHref ?? null,
  } satisfies Prisma.NotificationCreateManyInput;
}

export async function createNotification(input: {
  organizationId: string;
  userId?: string | null;
  title: string;
  description: string;
  type: NotificationType;
  severity: EventSeverity;
  module: string;
  actionHref?: string | null;
}) {
  return prisma.notification.create({
    data: buildNotificationPayload(input),
  });
}

export async function notifyOrganizationMembers(input: {
  organizationId: string;
  title: string;
  description: string;
  type: NotificationType;
  severity: EventSeverity;
  module: string;
  actionHref?: string | null;
  roles?: Array<"security_admin" | "cloud_security_analyst" | "compliance_officer" | "auditor" | "executive">;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: input.organizationId,
      ...(input.roles?.length ? { role: { in: input.roles } } : {}),
    },
    select: {
      userId: true,
    },
  });

  if (!memberships.length) {
    return [];
  }

  await prisma.notification.createMany({
    data: memberships.map((membership) =>
      buildNotificationPayload({
        organizationId: input.organizationId,
        userId: membership.userId,
        title: input.title,
        description: input.description,
        type: input.type,
        severity: input.severity,
        module: input.module,
        actionHref: input.actionHref,
      }),
    ),
  });

  return memberships;
}

export async function markNotificationRead(organizationId: string, notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      organizationId,
      OR: [{ userId }, { userId: null }],
    },
    data: {
      readAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function markAllNotificationsRead(organizationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      organizationId,
      OR: [{ userId }, { userId: null }],
      readAt: null,
    },
    data: {
      readAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
