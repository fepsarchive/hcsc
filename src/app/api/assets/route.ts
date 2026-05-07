import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listAssets } from "@/server/services/assets/assets-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_assets",
    target: "assets:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const items = await listAssets(auth.context.session.organizationId, {
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    classification: request.nextUrl.searchParams.get("classification") ?? undefined,
    location: request.nextUrl.searchParams.get("location") ?? undefined,
    riskLevel: request.nextUrl.searchParams.get("riskLevel") ?? undefined,
    encrypted: request.nextUrl.searchParams.get("encrypted") ?? undefined,
    isDeception: request.nextUrl.searchParams.get("isDeception") ?? undefined,
  });

  return apiOk(auth.context.requestId, items, { total: items.length });
}
