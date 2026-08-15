import "server-only";

import type { EventSeverity, NotificationType, Prisma } from "@prisma/client";

import { createNotification, notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

export async function createSecurityNotification(input: {
  organizationId: string;
  userId?: string | null;
  title: string;
  message: string;
  severity: EventSeverity;
  type?: NotificationType;
  actionHref?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return createNotification({
    organizationId: input.organizationId,
    userId: input.userId,
    title: input.title,
    description: input.message,
    type: input.type ?? "critical_event",
    severity: input.severity,
    module: "Security",
    actionHref: input.actionHref,
    metadata: input.metadata,
  });
}

export async function notifySecurityOperators(input: {
  organizationId: string;
  title: string;
  message: string;
  severity: EventSeverity;
  type?: NotificationType;
  actionHref?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}) {
  return notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: input.title,
    description: input.message,
    type: input.type ?? "critical_event",
    severity: input.severity,
    module: "Security",
    actionHref: input.actionHref,
    roles: ["security_admin", "cloud_security_analyst"],
    metadata: input.metadata,
  });
}
