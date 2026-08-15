import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
import { getSecurityEventById } from "@/server/security/security-event-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "view_dashboard",
    target: "security-events:detail",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const event = await getSecurityEventById(auth.context.session.organizationId, id);

  if (!event) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Security event bulunamadı.");
  }

  return apiOk(auth.context.requestId, mapSecurityEventRecord(event));
}
