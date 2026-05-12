import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { buildRequestMeta, createAuthAuditLog, getSessionContext, getSessionTokenFromRequest, markSessionTwoFactorVerified } from "@/server/auth/session";
import { verifyTwoFactorCode } from "@/server/auth/two-factor";

const verifySchema = z.object({
  code: z.string().trim().length(6),
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

  const json = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(json);

  if (!parsed.success) {
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

  const valid = verifyTwoFactorCode(parsed.data.code, session.user.twoFactorSecret?.secret);

  if (!valid) {
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
          message: "Doğrulama kodu hatalı.",
        },
      },
      { status: 401 },
    );
  }

  const updatedSession = await markSessionTwoFactorVerified(session.id);

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
      sessionStartedAt: updatedSession.lastSeenAt.toISOString(),
      user: mapDbUserToAppUser(session.user),
      organization: mapOrganizationToProfile(session.organization),
      onboardingCompleted: session.organization.onboardingCompleted,
    },
    meta: { requestId: meta.requestId },
    error: null,
  });
}
