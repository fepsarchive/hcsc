import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listEvents } from "@/server/services/events/events-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "events:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const items = await listEvents(auth.context.session.organizationId, {
    severity: request.nextUrl.searchParams.get("severity") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    category: request.nextUrl.searchParams.get("category") ?? undefined,
    search: request.nextUrl.searchParams.get("search") ?? undefined,
  });

  return apiOk(auth.context.requestId, items, { total: items.length });
}
