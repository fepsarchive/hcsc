import { NextRequest } from "next/server";
import { z } from "zod";

import { createPasswordResetRequest } from "@/server/auth/account";
import { apiOk, apiError } from "@/server/api/response";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { buildRequestMeta } from "@/server/auth/session";

const forgotPasswordSchema = z.object({
  email: z.email().trim(),
});

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const json = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(meta.requestId, 400, "VALIDATION_ERROR", "Geçerli bir e-posta adresi bekleniyor.");
  }

  const rateLimit = consumeRateLimit({
    key: `auth:forgot-password:${meta.ipAddress ?? "unknown"}:${parsed.data.email.toLowerCase()}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
  });

  if (!rateLimit.allowed) {
    return apiOk(meta.requestId, {
      message: "Eğer bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderilecektir.",
    });
  }

  const result = await createPasswordResetRequest({
    email: parsed.data.email,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    appOrigin: request.nextUrl.origin,
  });

  return apiOk(
    meta.requestId,
    {
      message: result.message,
    },
    process.env.NODE_ENV !== "production" && result.resetUrl
      ? {
          resetUrl: result.resetUrl,
        }
      : undefined,
  );
}
