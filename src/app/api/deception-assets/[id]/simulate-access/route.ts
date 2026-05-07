import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { simulateDeceptionAccess } from "@/server/services/deception/deception-service";

const bodySchema = z.object({
  identityProfileId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "trigger_deception",
    target: "deception-assets:simulate-access",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;
  const result = await simulateDeceptionAccess({
    organizationId: auth.context.session.organizationId,
    deceptionAssetId: id,
    identityProfileId: parsed.data.identityProfileId,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  if (!result) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Deception asset veya identity bulunamadı.");
  }

  return apiOk(auth.context.requestId, result);
}
