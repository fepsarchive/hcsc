import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { consumeRecoveryCode } from "@/server/auth/recovery-codes";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { buildRequestMeta, createAuthAuditLog, getSessionContext, getSessionTokenFromRequest } from "@/server/auth/session";
import { isReplayProtectedStep, isTwoFactorEnrolled, persistSuccessfulTwoFactorVerification, verifyTwoFactorCode } from "@/server/auth/two-factor";

const verifySchema = z.object({
  code: z.string().trim().min(6).max(32),
  method: z.enum(["totp", "recovery"]).default("totp"),
});

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const session = await getSessionContext(getSessionTokenFromRequest(request));

  if (!session) {
    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "UNAUTHENTICATED",
          message: "Önce giriş yapmalısın.",
        },
      },
      { status: 401 },
    );
  }

  if (session.is2FAVerified || session.status !== "pending_2fa") {
    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "TWO_FACTOR_ALREADY_VERIFIED",
          message: "Bu oturum için iki aşamalı doğrulama zaten tamamlandı.",
        },
      },
      { status: 409 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "VALIDATION_ERROR",
          message: "Geçerli bir doğrulama kodu bekleniyor.",
        },
      },
      { status: 400 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `auth:2fa:${meta.ipAddress ?? "unknown"}:${session.id}`,
    limit: 5,
    windowMs: 1000 * 60 * 10,
  });

  if (!rateLimit.allowed) {
    await createAuthAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      actorName: session.user.name,
      actorRole: mapDbUserToAppUser(session.user).role,
      action: "two_factor_failed",
      target: session.user.email,
      severity: "warning",
      result: "blocked",
      details: "Çok fazla 2FA denemesi nedeniyle istek geçici olarak engellendi.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId, retryAfterSeconds: rateLimit.retryAfterSeconds },
        error: {
          code: "RATE_LIMITED",
          message: "Çok fazla 2FA denemesi yapıldı. Lütfen kısa süre sonra tekrar dene.",
        },
      },
      { status: 429 },
    );
  }

  const twoFactorSecret = session.user.twoFactorSecret;

  if (
    !twoFactorSecret ||
    !isTwoFactorEnrolled({
      secret: twoFactorSecret.secret,
      enabledAt: twoFactorSecret.enabledAt,
      enrolledAt: twoFactorSecret.enrolledAt,
    })
  ) {
    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "TWO_FACTOR_SETUP_REQUIRED",
          message: "Bu hesap için önce iki aşamalı doğrulama kurulumu tamamlanmalı.",
        },
      },
      { status: 409 },
    );
  }

  if (parsed.data.method === "recovery") {
    const recovery = await consumeRecoveryCode({
      userId: session.userId,
      code: parsed.data.code,
    });

    if (!recovery.success) {
      await createAuthAuditLog({
        organizationId: session.organizationId,
        userId: session.userId,
        actorName: session.user.name,
        actorRole: mapDbUserToAppUser(session.user).role,
        action: "two_factor_failed",
        target: session.user.email,
        severity: "warning",
        result: "failure",
        details: "Geçersiz veya daha önce kullanılmış recovery code reddedildi.",
        ipAddress: meta.ipAddress,
        device: meta.userAgent,
      });

      return NextResponse.json(
        {
          data: null,
          meta: { requestId: meta.requestId },
          error: {
            code: "INVALID_2FA_CODE",
            message: "Doğrulama kodu hatalı veya süresi dolmuş.",
          },
        },
        { status: 401 },
      );
    }

    const updatedSession = await persistSuccessfulTwoFactorVerification({
      sessionId: session.id,
      userId: session.userId,
      twoFactorSecretId: twoFactorSecret.id,
    });

    await createAuthAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      actorName: session.user.name,
      actorRole: mapDbUserToAppUser(session.user).role,
      action: "recovery_code_used",
      target: session.user.email,
      severity: "info",
      result: "success",
      details: "Recovery code ile 2FA doğrulaması tamamlandı.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return NextResponse.json({
      data: {
        authenticated: true,
        twoFactorVerified: true,
        sessionStartedAt: updatedSession.createdAt.toISOString(),
        user: mapDbUserToAppUser(updatedSession.user),
        organization: mapOrganizationToProfile(updatedSession.organization),
        onboardingCompleted: updatedSession.organization.onboardingCompleted,
        twoFactorEnrolled: true,
        nextPath: updatedSession.organization.onboardingCompleted ? "/dashboard" : "/onboarding",
      },
      meta: { requestId: meta.requestId },
      error: null,
    });
  }

  if (!/^\d{6}$/.test(parsed.data.code)) {
    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "VALIDATION_ERROR",
          message: "6 haneli doğrulama kodu bekleniyor.",
        },
      },
      { status: 400 },
    );
  }

  const verification = verifyTwoFactorCode({
    code: parsed.data.code,
    secret: twoFactorSecret.secret,
  });

  if (!verification.valid) {
    await createAuthAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      actorName: session.user.name,
      actorRole: mapDbUserToAppUser(session.user).role,
      action: "two_factor_failed",
      target: session.user.email,
      severity: "warning",
      result: "failure",
      details: "Geçersiz 2FA kodu girildi.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "INVALID_2FA_CODE",
          message: "Doğrulama kodu hatalı veya süresi dolmuş.",
        },
      },
      { status: 401 },
    );
  }

  if (
    isReplayProtectedStep({
      matchedStep: verification.matchedStep,
      lastVerifiedStep: twoFactorSecret.lastVerifiedStep,
    })
  ) {
    await createAuthAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      actorName: session.user.name,
      actorRole: mapDbUserToAppUser(session.user).role,
      action: "two_factor_failed",
      target: session.user.email,
      severity: "warning",
      result: "failure",
      details: "Tekrar kullanılan veya süresi dolmuş TOTP kodu reddedildi.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "INVALID_2FA_CODE",
          message: "Doğrulama kodu hatalı veya süresi dolmuş.",
        },
      },
      { status: 401 },
    );
  }

  const updatedSession = await persistSuccessfulTwoFactorVerification({
    sessionId: session.id,
    userId: session.userId,
    twoFactorSecretId: twoFactorSecret.id,
    matchedStep: verification.matchedStep,
  });

  await createAuthAuditLog({
    organizationId: session.organizationId,
    userId: session.userId,
    actorName: session.user.name,
    actorRole: mapDbUserToAppUser(session.user).role,
    action: "two_factor_verified",
    target: session.user.email,
    severity: "info",
    result: "success",
    details: "2FA doğrulaması tamamlandı.",
    ipAddress: meta.ipAddress,
    device: meta.userAgent,
  });

  return NextResponse.json({
    data: {
      authenticated: true,
      twoFactorVerified: true,
      sessionStartedAt: updatedSession.createdAt.toISOString(),
      user: mapDbUserToAppUser(updatedSession.user),
      organization: mapOrganizationToProfile(updatedSession.organization),
      onboardingCompleted: updatedSession.organization.onboardingCompleted,
      twoFactorEnrolled: true,
      nextPath: updatedSession.organization.onboardingCompleted ? "/dashboard" : "/onboarding",
    },
    meta: { requestId: meta.requestId },
    error: null,
  });
}
