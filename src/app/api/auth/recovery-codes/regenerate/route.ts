import { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk, apiError } from "@/server/api/response";
import { replaceRecoveryCodesForUser, getRecoveryCodeStatus } from "@/server/auth/recovery-codes";
import { applyRateLimitHeaders, consumeRateLimitPolicy } from "@/server/auth/rate-limit";
import { createAuthAuditLog } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    target: "auth:recovery-codes-regenerate",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const rateLimit = await consumeRateLimitPolicy("recovery_regenerate", {
    ipAddress: auth.context.ipAddress,
    userId: auth.context.session.userId,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError(
        auth.context.requestId,
        429,
        "RATE_LIMITED",
        "Çok fazla deneme yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.",
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
      ),
      rateLimit,
    );
  }

  const recoveryCodes = await replaceRecoveryCodesForUser({
    userId: auth.context.session.userId,
  });
  const status = await getRecoveryCodeStatus(auth.context.session.userId);

  await createAuthAuditLog({
    organizationId: auth.context.session.organizationId,
    userId: auth.context.session.userId,
    actorName: auth.context.session.user.name,
    actorRole: auth.context.user.role,
    action: "recovery_codes_regenerated",
    target: auth.context.session.user.email,
    severity: "info",
    result: "success",
    details: "Recovery code seti yenilendi.",
    ipAddress: auth.context.ipAddress,
    device: auth.context.userAgent,
  });

  return applyRateLimitHeaders(
    apiOk(auth.context.requestId, {
      recoveryCodes,
      status,
    }),
    rateLimit,
  );
}
