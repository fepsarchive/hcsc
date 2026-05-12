import { NextRequest } from "next/server";
import { z } from "zod";

import { resetPasswordWithToken } from "@/server/auth/account";
import { apiError, apiOk } from "@/server/api/response";
import { consumeRateLimit } from "@/server/auth/rate-limit";
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

  const rateLimit = consumeRateLimit({
    key: `auth:reset-password:${meta.ipAddress ?? "unknown"}:${parsed.data.token.slice(0, 12)}`,
    limit: 10,
    windowMs: 1000 * 60 * 15,
  });

  if (!rateLimit.allowed) {
    return apiError(
      meta.requestId,
      429,
      "RATE_LIMITED",
      "Çok fazla parola yenileme denemesi yapıldı. Lütfen kısa süre sonra tekrar dene.",
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
    );
  }

  const result = await resetPasswordWithToken({
    token: parsed.data.token,
    password: parsed.data.password,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (!result.success) {
    return apiError(meta.requestId, 400, result.code, result.message);
  }

  return apiOk(meta.requestId, {
    success: true,
    message: "Parolan güvenli şekilde yenilendi. Yeni parolanla giriş yapabilirsin.",
  });
}
