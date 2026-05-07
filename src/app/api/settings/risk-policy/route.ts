import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { updateRiskPolicy } from "@/server/services/settings/settings-service";

const bodySchema = z.object({
  criticalClassificationWeight: z.number().int().min(0).max(100).optional(),
  missingEncryptionWeight: z.number().int().min(0).max(100).optional(),
  publicCloudSensitiveWeight: z.number().int().min(0).max(100).optional(),
  missingBackupWeight: z.number().int().min(0).max(100).optional(),
  noKmsWeight: z.number().int().min(0).max(100).optional(),
  openCriticalEventWeight: z.number().int().min(0).max(100).optional(),
  deceptionTriggerWeight: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "manage_settings",
    target: "settings:risk-policy",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const updated = await updateRiskPolicy({
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
