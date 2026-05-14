import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { createAuthAuditLog } from "@/server/auth/session";
import { ensureRecoveryCodesForUser } from "@/server/auth/recovery-codes";
import {
  isReplayProtectedStep,
  isTwoFactorEnrolled,
  persistSuccessfulTwoFactorVerification,
  verifyTwoFactorCode,
} from "@/server/auth/two-factor";

const confirmSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: false,
    target: "auth:2fa-confirm",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const json = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(auth.context.requestId, 400, "VALIDATION_ERROR", "6 haneli doğrulama kodu bekleniyor.");
  }

  const rateLimit = consumeRateLimit({
    key: `auth:2fa-confirm:${auth.context.ipAddress ?? "unknown"}:${auth.context.session.id}`,
    limit: 5,
    windowMs: 1000 * 60 * 10,
  });

  if (!rateLimit.allowed) {
    await createAuthAuditLog({
      organizationId: auth.context.session.organizationId,
      userId: auth.context.session.userId,
      actorName: auth.context.session.user.name,
      actorRole: auth.context.user.role,
      action: "two_factor_failed",
      target: auth.context.session.user.email,
      severity: "warning",
      result: "blocked",
      details: "Çok fazla 2FA kurulum denemesi nedeniyle istek geçici olarak engellendi.",
      ipAddress: auth.context.ipAddress,
      device: auth.context.userAgent,
    });

    return apiError(
      auth.context.requestId,
      429,
      "RATE_LIMITED",
      "Çok fazla 2FA kurulum denemesi yapıldı. Lütfen kısa süre sonra tekrar dene.",
      { retryAfterSeconds: rateLimit.retryAfterSeconds },
    );
  }

  const twoFactorSecret = auth.context.session.user.twoFactorSecret;

  if (!twoFactorSecret) {
    return apiError(auth.context.requestId, 409, "TWO_FACTOR_SETUP_REQUIRED", "Önce 2FA kurulumunu başlat.");
  }

  if (
    isTwoFactorEnrolled({
      secret: twoFactorSecret.secret,
      enabledAt: twoFactorSecret.enabledAt,
      enrolledAt: twoFactorSecret.enrolledAt,
    })
  ) {
    return apiError(auth.context.requestId, 409, "TWO_FACTOR_ALREADY_ENROLLED", "Bu hesap için 2FA zaten kurulu.");
  }

  const verification = verifyTwoFactorCode({
    code: parsed.data.code,
    secret: twoFactorSecret.secret,
  });

  if (!verification.valid) {
    await createAuthAuditLog({
      organizationId: auth.context.session.organizationId,
      userId: auth.context.session.userId,
      actorName: auth.context.session.user.name,
      actorRole: auth.context.user.role,
      action: "two_factor_failed",
      target: auth.context.session.user.email,
      severity: "warning",
      result: "failure",
      details: "Geçersiz TOTP kurulum kodu girildi.",
      ipAddress: auth.context.ipAddress,
      device: auth.context.userAgent,
    });

    return apiError(auth.context.requestId, 401, "INVALID_2FA_CODE", "Doğrulama kodu hatalı veya süresi dolmuş.");
  }

  if (
    isReplayProtectedStep({
      matchedStep: verification.matchedStep,
      lastVerifiedStep: twoFactorSecret.lastVerifiedStep,
    })
  ) {
    await createAuthAuditLog({
      organizationId: auth.context.session.organizationId,
      userId: auth.context.session.userId,
      actorName: auth.context.session.user.name,
      actorRole: auth.context.user.role,
      action: "two_factor_failed",
      target: auth.context.session.user.email,
      severity: "warning",
      result: "failure",
      details: "Tekrar kullanılan veya süresi dolmuş TOTP kodu reddedildi.",
      ipAddress: auth.context.ipAddress,
      device: auth.context.userAgent,
    });

    return apiError(auth.context.requestId, 401, "INVALID_2FA_CODE", "Doğrulama kodu hatalı veya süresi dolmuş.");
  }

  const updatedSession = await persistSuccessfulTwoFactorVerification({
    sessionId: auth.context.session.id,
    userId: auth.context.session.userId,
    twoFactorSecretId: twoFactorSecret.id,
    matchedStep: verification.matchedStep,
    markEnrollment: true,
  });
  const recoveryCodes = await ensureRecoveryCodesForUser({
    userId: auth.context.session.userId,
  });

  await createAuthAuditLog({
    organizationId: auth.context.session.organizationId,
    userId: auth.context.session.userId,
    actorName: auth.context.session.user.name,
    actorRole: auth.context.user.role,
    action: "two_factor_verified",
    target: auth.context.session.user.email,
    severity: "info",
    result: "success",
    details: "2FA kurulumu tamamlandı ve oturum doğrulandı.",
    ipAddress: auth.context.ipAddress,
    device: auth.context.userAgent,
  });

  return apiOk(auth.context.requestId, {
    authenticated: true,
    twoFactorVerified: true,
    sessionStartedAt: updatedSession.createdAt.toISOString(),
    user: mapDbUserToAppUser(updatedSession.user),
    organization: mapOrganizationToProfile(updatedSession.organization),
    onboardingCompleted: updatedSession.organization.onboardingCompleted,
    twoFactorEnrolled: true,
    recoveryCodes: recoveryCodes ?? undefined,
    nextPath: updatedSession.organization.onboardingCompleted ? "/dashboard" : "/onboarding",
  });
}
