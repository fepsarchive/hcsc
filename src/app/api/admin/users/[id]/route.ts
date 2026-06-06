import { type NextRequest } from "next/server";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { getAdminUserDetail } from "@/server/admin/admin-service";
import { apiError, apiOk } from "@/server/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const detail = await getAdminUserDetail(id);

    if (!detail) {
      return apiError(auth.requestId, 404, "ADMIN_USER_NOT_FOUND", "Kullanıcı bulunamadı.");
    }

    return apiOk(auth.requestId, detail);
  } catch {
    return apiError(auth.requestId, 500, "ADMIN_USER_DETAIL_FAILED", "Admin kullanıcı detayı alınamadı.");
  }
}
