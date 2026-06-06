import { type NextRequest } from "next/server";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { getAdminSecurityPosture } from "@/server/admin/admin-security";
import { apiError, apiOk } from "@/server/api/response";

export async function GET(request: NextRequest) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    return apiOk(auth.requestId, await getAdminSecurityPosture());
  } catch {
    return apiError(auth.requestId, 500, "ADMIN_SECURITY_FAILED", "Admin güvenlik durumu alınamadı.");
  }
}
