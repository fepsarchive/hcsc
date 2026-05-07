import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { updateOrganizationSettings } from "@/server/services/settings/settings-service";

const bodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  plan: z.string().trim().min(1).optional(),
  region: z.string().trim().min(1).optional(),
  cloudMode: z.enum(["private_cloud", "public_cloud", "hybrid_cloud"]).optional(),
  complianceFrameworks: z.array(z.string().trim().min(1)).optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "manage_settings",
    target: "settings:organization",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const updated = await updateOrganizationSettings({
    organizationId: auth.context.session.organizationId,
    data: parsed.data,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  return apiOk(auth.context.requestId, updated);
}
