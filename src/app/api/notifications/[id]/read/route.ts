import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { markNotificationRead } from "@/server/services/notifications/notification-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "notification:read",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  await markNotificationRead(auth.context.session.organizationId, id, auth.context.session.userId);

  await createAuditLog({
    organizationId: auth.context.session.organizationId,
    userId: auth.context.session.userId,
    actorName: auth.context.user.name,
    actorRole: auth.context.user.role,
    action: "notification_read",
    module: "Notifications",
    target: id,
    severity: "info",
    result: "success",
    details: `Notification ${id} okundu olarak işaretlendi.`,
    ipAddress: auth.context.ipAddress,
    device: auth.context.userAgent,
  });

  return apiOk(auth.context.requestId, { read: true, notificationId: id });
}
