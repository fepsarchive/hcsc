import { NextRequest } from "next/server";
import { z } from "zod";

import { createPasswordResetRequest } from "@/server/auth/account";
import { apiOk, apiError } from "@/server/api/response";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { buildRequestMeta } from "@/server/auth/session";

const forgotPasswordSchema = z.object({
  email: z.email().trim(),
});

function maskEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const [localPart = "", domainPart = ""] = normalized.split("@");

  if (!domainPart) {
    return "***";
  }

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart.charAt(0) || "*"}*`
      : `${localPart.slice(0, 2)}***`;

  const domainSegments = domainPart.split(".");
  const domainName = domainSegments[0] ?? "";
  const domainSuffix = domainSegments.slice(1).join(".");
  const visibleDomain =
    domainName.length <= 2 ? `${domainName.charAt(0) || "*"}*` : `${domainName.slice(0, 2)}***`;

  return `${visibleLocal}@${visibleDomain}${domainSuffix ? `.${domainSuffix}` : ""}`;
}

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const json = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(meta.requestId, 400, "VALIDATION_ERROR", "Geçerli bir e-posta adresi bekleniyor.");
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  console.info("[auth] forgot-password request received", {
    requestId: meta.requestId,
    email: maskEmail(parsed.data.email),
    hasIpAddress: Boolean(meta.ipAddress),
    hasUserAgent: Boolean(meta.userAgent),
    env: process.env.NODE_ENV,
  });

  const rateLimit = consumeRateLimit({
    key: `auth:forgot-password:${meta.ipAddress ?? "unknown"}:${normalizedEmail}`,
    limit: 5,
    windowMs: 1000 * 60 * 15,
  });

  console.info("[auth] forgot-password normalized email", {
    requestId: meta.requestId,
    email: maskEmail(normalizedEmail),
    env: process.env.NODE_ENV,
  });

  if (!rateLimit.allowed) {
    return apiOk(meta.requestId, {
      message: "Eğer bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderilecektir.",
    });
  }

  const result = await createPasswordResetRequest({
    email: normalizedEmail,
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
