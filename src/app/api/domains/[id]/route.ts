import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { checkConnectedDomain, connectDomainProvider } from "@/server/integrations/domain-service";
import { createAuthAuditLog } from "@/server/auth/session";
import { applyRateLimitHeaders, consumeRateLimitPolicy } from "@/server/auth/rate-limit";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["verify", "check", "activate"]) }),
  z.object({ action: z.literal("connect"), zoneId: z.string().regex(/^[a-f0-9]{32}$/), token: z.string().trim().min(20).max(512) }),
]);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, { permission: "manage_settings" });
  if (!auth.ok) return auth.response;
  const limit = await consumeRateLimitPolicy("domain_check", { userId: auth.context.session.userId });
  if (!limit.allowed) return applyRateLimitHeaders(apiError(auth.context.requestId, 429, "RATE_LIMITED", "Kontrol sınırına ulaşıldı. Bir dakika sonra tekrar dene."), limit);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(auth.context.requestId, 400, "INVALID_ACTION", "Geçerli işlem alanları gerekli.");
  const { id } = await context.params;
  const { session } = auth.context;
  try {
    const input = parsed.data;
    const result = input.action === "connect"
      ? await connectDomainProvider(session.organizationId, id, input.zoneId, input.token)
      : await checkConnectedDomain(session.organizationId, id, input.action === "activate");
    await createAuthAuditLog({ organizationId: session.organizationId, userId: session.userId,
      actorName: session.user.name, actorRole: session.user.role, action: `domain_${input.action}`,
      target: result.hostname, severity: "info", result: "activationBlocked" in result && result.activationBlocked ? "blocked" : "success", details: `Domain durumu: ${result.status}`,
      ipAddress: auth.context.ipAddress, device: auth.context.userAgent });
    return apiOk(auth.context.requestId, result);
  } catch (error) {
    return apiError(auth.context.requestId, 400, "DOMAIN_ACTION_FAILED", error instanceof Error ? error.message : "Domain işlemi başarısız.");
  }
}
