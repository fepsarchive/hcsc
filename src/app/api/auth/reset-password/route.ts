import { NextRequest } from "next/server";
import { z } from "zod";

import { resetPasswordWithToken } from "@/server/auth/account";
import { apiError, apiOk } from "@/server/api/response";
import { applyRateLimitHeaders, consumeRateLimitPolicy, createRateLimitTokenFingerprint } from "@/server/auth/rate-limit";
import { buildRequestMeta } from "@/server/auth/session";

const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler birbiriyle eşleşmiyor.",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const json = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(meta.requestId, 400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Geçerli bir parola bekleniyor.");
  }

  const rateLimit = await consumeRateLimitPolicy("reset_password", {
    ipAddress: meta.ipAddress,
    tokenFingerprint: createRateLimitTokenFingerprint(parsed.data.token),
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

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (!result.success) {
    return applyRateLimitHeaders(apiError(meta.requestId, 400, result.code, result.message), rateLimit);
  }

  return applyRateLimitHeaders(
    apiOk(meta.requestId, {
      success: true,
      message: "Parolan güvenli şekilde yenilendi. Yeni parolanla giriş yapabilirsin.",
    }),
    rateLimit,
  );
}
