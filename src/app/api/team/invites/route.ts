import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { createTeamInvite, listTeamInvites } from "@/server/team/team-service";

const inviteSchema = z.object({
  email: z.email().trim(),
  role: z.enum([
    "security_admin",
    "cloud_security_analyst",
    "compliance_officer",
    "auditor",
    "executive",
  ]),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    permission: "manage_settings",
    target: "team:invites",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const invites = await listTeamInvites(auth.context.session.organizationId);

  return apiOk(auth.context.requestId, {
    invites,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    permission: "manage_settings",
    target: "team:create-invite",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const json = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(auth.context.requestId, 400, "VALIDATION_ERROR", "Geçerli bir e-posta ve rol bekleniyor.");
  }

  const result = await createTeamInvite({
    organizationId: auth.context.session.organizationId,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (!result.success) {
    return apiError(auth.context.requestId, 409, result.code, result.message);
  }

  return apiOk(auth.context.requestId, result);
}
