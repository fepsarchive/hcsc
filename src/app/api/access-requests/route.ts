import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiCreated, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { createAccessRequest, listAccessRequests } from "@/server/services/access-requests/access-requests-service";

const createSchema = z.object({
  identityProfileId: z.string().min(1),
  assetId: z.string().min(1),
  requestedAction: z.enum(["read", "write", "export", "delete", "admin"]),
  justification: z.string().trim().min(1).optional(),
  sourceLocation: z.enum(["private_cloud", "public_cloud", "saas", "backup", "deception"]),
  sourceRegion: z.string().trim().min(1),
  deviceTrust: z.enum(["trusted", "managed", "unknown", "compromised"]),
  mfa: z.boolean(),
  anomalyScore: z.number().int().min(0).max(100),
  locationRisk: z.enum(["low", "medium", "high"]),
  timeRisk: z.enum(["normal", "elevated", "off_hours"]),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "evaluate_access",
    target: "access-requests:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const items = await listAccessRequests(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, items, { total: items.length });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "evaluate_access",
    target: "access-requests:create",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, createSchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const created = await createAccessRequest({
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
