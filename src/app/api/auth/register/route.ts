import { NextRequest } from "next/server";
import { z } from "zod";

import { registerWorkspaceAccount } from "@/server/auth/account";
import { apiCreated, apiError } from "@/server/api/response";
import { applyRateLimitHeaders, consumeRateLimitPolicy } from "@/server/auth/rate-limit";
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

  const rateLimit = await consumeRateLimitPolicy("register", {
    ipAddress: meta.ipAddress,
    email: parsed.data.email,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError(
        meta.requestId,
        429,
        "RATE_LIMITED",
        "Çok fazla deneme yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.",
        { retryAfterSeconds: rateLimit.retryAfterSeconds },
      ),
      rateLimit,
    );
  }

  const result = await registerWorkspaceAccount({
    ...parsed.data,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (!result.success) {
    return applyRateLimitHeaders(apiError(meta.requestId, 409, result.code, result.message), rateLimit);
  }

  const response = apiCreated(meta.requestId, {
    requires2FA: true,
    authenticated: true,
    twoFactorVerified: false,
    sessionStartedAt: result.session.createdAt.toISOString(),
    user: result.user,
    organization: result.organization,
    onboardingCompleted: result.onboardingCompleted,
    twoFactorEnrolled: false,
  });

  setSessionCookie(response, result.rawToken);

  return applyRateLimitHeaders(response, rateLimit);
}
