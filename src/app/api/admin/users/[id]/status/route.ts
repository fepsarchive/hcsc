import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { updateAdminUserStatus } from "@/server/admin/admin-service";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";

const bodySchema = z.object({
  status: z.enum(["active", "suspended"]),
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
    const updated = await updateAdminUserStatus({
      session: auth.session,
      targetUserId: id,
      status: parsed.data.status,
      ipAddress: auth.ipAddress,
      device: auth.userAgent,
    });

    return apiOk(auth.requestId, updated);
  } catch (error) {
    return apiError(
      auth.requestId,
      400,
      "ADMIN_USER_STATUS_UPDATE_FAILED",
      error instanceof Error ? error.message : "Kullanıcı durumu güncellenemedi.",
    );
  }
}
