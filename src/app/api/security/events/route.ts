import { type EventCategory, type EventSeverity, type EventStatus } from "@prisma/client";
import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
import { listSecurityEvents } from "@/server/security/security-event-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "security-events:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const events = await listSecurityEvents({
    organizationId: auth.context.session.organizationId,
    severity: (request.nextUrl.searchParams.get("severity") as EventSeverity | null) ?? undefined,
    status: (request.nextUrl.searchParams.get("status") as EventStatus | null) ?? undefined,
    category: (request.nextUrl.searchParams.get("category") as EventCategory | null) ?? undefined,
    search: request.nextUrl.searchParams.get("search") ?? undefined,
  });

  const items = events.map(mapSecurityEventRecord);

  return apiOk(auth.context.requestId, items, { total: items.length });
}
