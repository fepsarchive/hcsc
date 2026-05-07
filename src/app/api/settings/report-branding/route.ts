import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { updateReportBranding } from "@/server/services/settings/settings-service";

const bodySchema = z.object({
  companyName: z.string().trim().min(1).optional(),
  reportFooter: z.string().trim().min(1).optional(),
  preparedByLabel: z.string().trim().min(1).optional(),
  confidentialityLabel: z.string().trim().min(1).optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "manage_settings",
    target: "settings:report-branding",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const updated = await updateReportBranding({
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
