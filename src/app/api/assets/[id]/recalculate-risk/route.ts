import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { recalculateAssetRisk } from "@/server/services/assets/assets-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "manage_assets",
    target: "asset:recalculate-risk",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const asset = await recalculateAssetRisk({
    organizationId: auth.context.session.organizationId,
    assetId: id,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  if (!asset) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Asset bulunamadı.");
  }

  return apiOk(auth.context.requestId, asset);
}
