import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { listTeamMembers, updateTeamMemberRole } from "@/server/team/team-service";

const roleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum([
    "security_admin",
    "cloud_security_analyst",
    "compliance_officer",
    "auditor",
    "executive",
  ]),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    permission: "manage_settings",
    target: "team:update-role",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const json = await request.json().catch(() => null);
  const parsed = roleSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(auth.context.requestId, 400, "VALIDATION_ERROR", "Geçerli bir kullanıcı ve rol bekleniyor.");
  }

  const result = await updateTeamMemberRole({
    organizationId: auth.context.session.organizationId,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
    targetUserId: parsed.data.userId,
    nextRole: parsed.data.role,
  });

  if (!result.success) {
    return apiError(
      auth.context.requestId,
      result.code === "MEMBER_NOT_FOUND" ? 404 : 409,
      result.code,
      result.message,
    );
  }

  const members = await listTeamMembers(auth.context.session.organizationId);

  return apiOk(auth.context.requestId, {
    members,
  });
}
