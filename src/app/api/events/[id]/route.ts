import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { getEvent } from "@/server/services/events/events-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "event:detail",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const event = await getEvent(auth.context.session.organizationId, id);

  if (!event) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Event bulunamadı.");
  }

  return apiOk(auth.context.requestId, event);
}
