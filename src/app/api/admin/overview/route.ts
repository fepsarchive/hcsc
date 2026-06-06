import { type NextRequest } from "next/server";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { getAdminOverviewData } from "@/server/admin/admin-service";
import { apiError, apiOk } from "@/server/api/response";

export async function GET(request: NextRequest) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    return apiOk(auth.requestId, await getAdminOverviewData());
  } catch {
    return apiError(auth.requestId, 500, "ADMIN_OVERVIEW_FAILED", "Admin overview alınamadı.");
  }
}
