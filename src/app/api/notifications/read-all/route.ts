import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { markAllNotificationsRead } from "@/server/services/notifications/notification-service";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "notifications:read-all",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const result = await markAllNotificationsRead(
    auth.context.session.organizationId,
    auth.context.session.userId,
  );

  await createAuditLog({
    organizationId: auth.context.session.organizationId,
    userId: auth.context.session.userId,
    actorName: auth.context.user.name,
    actorRole: auth.context.user.role,
    action: "notifications_read_all",
    module: "Notifications",
    target: "all-notifications",
    severity: "info",
    result: "success",
    details: `${result.count} notification okundu olarak işaretlendi.`,
    ipAddress: auth.context.ipAddress,
    device: auth.context.userAgent,
  });

  return apiOk(auth.context.requestId, { updatedCount: result.count });
}
