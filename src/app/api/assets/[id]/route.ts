import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { getAsset } from "@/server/services/assets/assets-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "view_assets",
    target: "asset:detail",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const asset = await getAsset(auth.context.session.organizationId, id);

  if (!asset) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Asset bulunamadı.");
  }

  return apiOk(auth.context.requestId, asset);
}
