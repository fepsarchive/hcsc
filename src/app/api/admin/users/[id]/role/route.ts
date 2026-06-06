import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { updateAdminUserPlatformRole } from "@/server/admin/admin-service";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";

const bodySchema = z.object({
  platformRole: z.enum(["USER", "ADMIN"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;

  try {
    const updated = await updateAdminUserPlatformRole({
      session: auth.session,
      targetUserId: id,
      platformRole: parsed.data.platformRole,
      ipAddress: auth.ipAddress,
      device: auth.userAgent,
    });

    return apiOk(auth.requestId, updated);
  } catch (error) {
    return apiError(
      auth.requestId,
      400,
      "ADMIN_USER_ROLE_UPDATE_FAILED",
      error instanceof Error ? error.message : "Kullanıcı rolü güncellenemedi.",
    );
  }
}
