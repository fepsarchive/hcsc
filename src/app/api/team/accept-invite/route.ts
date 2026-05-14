import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { createVerifiedSession, revokeSession, setSessionCookie } from "@/server/auth/session";
import { acceptTeamInvite } from "@/server/team/team-service";

const acceptSchema = z.object({
  token: z.string().trim().min(24),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    target: "team:accept-invite",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const json = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(auth.context.requestId, 400, "VALIDATION_ERROR", "Geçerli bir davet tokenı bekleniyor.");
  }

  const result = await acceptTeamInvite({
    token: parsed.data.token,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
    currentUserId: auth.context.session.userId,
    currentEmail: auth.context.user.email,
  });

  if (!result.success) {
    return apiError(auth.context.requestId, 409, result.code, result.message);
  }

  const { rawToken } = await createVerifiedSession({
    userId: auth.context.session.userId,
    organizationId: result.organization.id,
    ipAddress: auth.context.ipAddress,
    userAgent: auth.context.userAgent,
  });

  await revokeSession(auth.context.session.id);

  const response = apiOk(auth.context.requestId, result);
  setSessionCookie(response, rawToken);

  return response;
}
