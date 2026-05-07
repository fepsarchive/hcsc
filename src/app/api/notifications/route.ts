import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";
import { mapNotificationRecord } from "@/server/services/core/domain-mappers";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "notifications:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const notifications = await prisma.notification.findMany({
    where: {
      organizationId: auth.context.session.organizationId,
      OR: [{ userId: auth.context.session.userId }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return apiOk(auth.context.requestId, notifications.map(mapNotificationRecord), {
    total: notifications.length,
  });
}
