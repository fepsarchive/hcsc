import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { mapAssetRecord } from "@/server/services/core/domain-mappers";
import { listAssets } from "@/server/services/assets/assets-service";
import { createDataAsset } from "@/server/security/data-asset-service";

const createAssetSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().nullable(),
  sensitivity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  exposure: z.enum(["INTERNAL", "SHARED", "PUBLIC", "UNKNOWN"]).optional(),
  environment: z.enum(["CLOUD", "HYBRID", "ON_PREM", "SAAS"]).optional(),
  provider: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(12).optional(),
});

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

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "manage_assets",
    target: "assets:create",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, createAssetSchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const asset = await createDataAsset({
    organizationId: auth.context.session.organizationId,
    ownerUserId: auth.context.session.userId,
    ownerName: auth.context.user.name,
    ...parsed.data,
  });

  return apiOk(auth.context.requestId, mapAssetRecord(asset), { status: "created" });
}
