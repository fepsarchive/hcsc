import { type EventStatus } from "@prisma/client";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { mapSecurityEventRecord } from "@/server/services/core/domain-mappers";
import { updateSecurityEventStatus } from "@/server/security/security-event-service";

const bodySchema = z.object({
  status: z.enum(["open", "investigating", "contained", "resolved", "false_positive"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "run_playbook",
    target: "security-events:update-status",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;
  const event = await updateSecurityEventStatus({
    organizationId: auth.context.session.organizationId,
    id,
    status: parsed.data.status as EventStatus,
  });

  if (!event) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Security event bulunamadı.");
  }

  return apiOk(auth.context.requestId, mapSecurityEventRecord(event));
}
