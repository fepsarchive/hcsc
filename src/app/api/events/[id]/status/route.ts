import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { updateEventStatus } from "@/server/services/events/events-service";

const bodySchema = z.object({
  status: z.enum(["open", "investigating", "contained", "resolved"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "run_playbook",
    target: "event:update-status",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;
  const updated = await updateEventStatus({
    organizationId: auth.context.session.organizationId,
    eventId: id,
    status: parsed.data.status,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  if (!updated) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Event bulunamadı.");
  }

  return apiOk(auth.context.requestId, updated);
}
