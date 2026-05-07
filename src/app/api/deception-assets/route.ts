import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiCreated, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { createDeceptionAsset, listDeceptionAssets } from "@/server/services/deception/deception-service";

const bodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  fakeType: z.enum(["bucket", "database", "api", "token_store", "log_archive"]),
  mappedThreat: z.string().trim().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  recommendedResponse: z.string().trim().min(1),
  autoActions: z
    .array(
      z.enum([
        "account_lock",
        "revoke_token",
        "require_mfa",
        "isolate_identity",
        "isolate_resource",
        "create_ticket",
        "notify_security_team",
        "mark_contained",
        "mark_resolved",
      ]),
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "trigger_deception",
    target: "deception-assets:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const items = await listDeceptionAssets(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, items, { total: items.length });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "create_deception_asset",
    target: "deception-assets:create",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const created = await createDeceptionAsset({
    organizationId: auth.context.session.organizationId,
    ...parsed.data,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  return apiCreated(auth.context.requestId, created);
}
