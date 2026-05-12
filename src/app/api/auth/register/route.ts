import { NextRequest } from "next/server";
import { z } from "zod";

import { registerWorkspaceAccount } from "@/server/auth/account";
import { apiCreated, apiError } from "@/server/api/response";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { buildRequestMeta, setSessionCookie } from "@/server/auth/session";

const registerSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.email().trim(),
  password: z.string().min(8),
  companyName: z.string().trim().min(2),
});

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const json = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(meta.requestId, 400, "VALIDATION_ERROR", "Geçerli kayıt alanları bekleniyor.");
  }

  const rateLimit = consumeRateLimit({
    key: `auth:register:${meta.ipAddress ?? "unknown"}:${parsed.data.email.toLowerCase()}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
  });

  if (!rateLimit.allowed) {
    return apiError(
      meta.requestId,
      429,
      "RATE_LIMITED",
      "Çok fazla kayıt denemesi yapıldı. Lütfen kısa süre sonra tekrar dene.",
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
    );
  }

  const result = await registerWorkspaceAccount({
    ...parsed.data,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (!result.success) {
    return apiError(meta.requestId, 409, result.code, result.message);
  }

  const response = apiCreated(meta.requestId, {
    requires2FA: true,
    authenticated: true,
    twoFactorVerified: false,
    sessionStartedAt: result.session.createdAt.toISOString(),
    user: result.user,
    organization: result.organization,
    onboardingCompleted: result.onboardingCompleted,
  });

  setSessionCookie(response, result.rawToken);

  return response;
}
