import { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk, apiError } from "@/server/api/response";
import { replaceRecoveryCodesForUser, getRecoveryCodeStatus } from "@/server/auth/recovery-codes";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { createAuthAuditLog } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    target: "auth:recovery-codes-regenerate",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const rateLimit = consumeRateLimit({
    key: `auth:recovery-codes-regenerate:${auth.context.ipAddress ?? "unknown"}:${auth.context.session.userId}`,
    limit: 3,
    windowMs: 1000 * 60 * 15,
  });

  if (!rateLimit.allowed) {
    return apiError(
      auth.context.requestId,
      429,
      "RATE_LIMITED",
      "Çok fazla recovery code yenileme denemesi yapıldı. Lütfen kısa süre sonra tekrar dene.",
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
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

  return apiOk(auth.context.requestId, {
    recoveryCodes,
    status,
  });
}
