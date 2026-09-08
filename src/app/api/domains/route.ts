import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/api/require-auth";
import { apiCreated, apiError, apiOk } from "@/server/api/response";
import { addConnectedDomain, listConnectedDomains } from "@/server/integrations/domain-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, { permission: "manage_settings" });
  if (!auth.ok) return auth.response;
  return apiOk(auth.context.requestId, await listConnectedDomains(auth.context.session.organizationId));
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, { permission: "manage_settings" });
  if (!auth.ok) return auth.response;
  const parsed = z.object({ hostname: z.string().min(3).max(253) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(auth.context.requestId, 400, "INVALID_DOMAIN", "Geçerli domain gerekli.");
  try {
    return apiCreated(auth.context.requestId, await addConnectedDomain(auth.context.session.organizationId, parsed.data.hostname));
  } catch (error) {
    return apiError(auth.context.requestId, 400, "DOMAIN_REJECTED", error instanceof Error ? error.message : "Domain eklenemedi.");
  }
}
