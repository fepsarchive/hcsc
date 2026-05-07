import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { executeEventPlaybook } from "@/server/services/events/events-service";

const bodySchema = z.object({
  action: z.enum([
    "account_lock",
    "revoke_token",
    "require_mfa",
    "isolate_identity",
    "isolate_resource",
    "create_ticket",
    "notify_security_team",
    "mark_contained",
    "mark_resolved",
  ]),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "run_playbook",
    target: "event:playbook",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;
  const updated = await executeEventPlaybook({
    organizationId: auth.context.session.organizationId,
    eventId: id,
    action: parsed.data.action,
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
