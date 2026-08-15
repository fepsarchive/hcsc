import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { mapAssetRecord } from "@/server/services/core/domain-mappers";
import { getAsset } from "@/server/services/assets/assets-service";
import { updateDataAsset } from "@/server/security/data-asset-service";

const updateAssetSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  sensitivity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  exposure: z.enum(["INTERNAL", "SHARED", "PUBLIC", "UNKNOWN"]).optional(),
  environment: z.enum(["CLOUD", "HYBRID", "ON_PREM", "SAAS"]).optional(),
  provider: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
  status: z.enum(["ACTIVE", "REVIEW_REQUIRED", "ARCHIVED"]).optional(),
});

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "manage_assets",
    target: "asset:update",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, updateAssetSchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const { id } = await params;
  const asset = await updateDataAsset({
    organizationId: auth.context.session.organizationId,
    id,
    ...parsed.data,
  });

  if (!asset) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Asset bulunamadı.");
  }

  return apiOk(auth.context.requestId, mapAssetRecord(asset));
}
