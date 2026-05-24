import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { revokeTeamInvite } from "@/server/team/team-service";

const revokeSchema = z.object({
  inviteId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    permission: "manage_settings",
    target: "team:revoke-invite",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const json = await request.json().catch(() => null);
  const parsed = revokeSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(auth.context.requestId, 400, "VALIDATION_ERROR", "Geçerli bir davet kaydı bekleniyor.");
  }

  const result = await revokeTeamInvite({
    organizationId: auth.context.session.organizationId,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
    inviteId: parsed.data.inviteId,
  });

  if (!result.success) {
    return apiError(auth.context.requestId, 404, result.code, result.message);
  }

  return apiOk(auth.context.requestId, {
    success: true,
  });
}
