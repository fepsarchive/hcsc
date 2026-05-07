import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { verifyPassword } from "@/server/auth/password";
import { buildRequestMeta, createAuthAuditLog, createPendingSession, setSessionCookie } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "VALIDATION_ERROR",
          message: "Geçerli e-posta ve parola bekleniyor.",
        },
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  const organizationId =
    user?.memberships[0]?.organizationId ??
    (await prisma.organization.findFirst({ select: { id: true } }))?.id ??
    "unknown";

  await createAuthAuditLog({
    organizationId,
    userId: user?.id ?? null,
    actorName: user?.name ?? email,
    actorRole: user ? mapDbUserToAppUser(user).role : "Anonymous",
    action: "login_attempt",
    target: email,
    severity: "info",
    result: "success",
    details: "Kullanıcı giriş denemesi yaptı.",
    ipAddress: meta.ipAddress,
    device: meta.userAgent,
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash) || !user.memberships[0]) {
    await createAuthAuditLog({
      organizationId,
      userId: user?.id ?? null,
      actorName: user?.name ?? email,
      actorRole: user ? mapDbUserToAppUser(user).role : "Anonymous",
      action: "login_failed",
      target: email,
      severity: "warning",
      result: "failure",
      details: "E-posta veya parola doğrulanamadı.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return NextResponse.json(
      {
        data: null,
        meta: { requestId: meta.requestId },
        error: {
          code: "INVALID_CREDENTIALS",
          message: "E-posta veya parola hatalı.",
        },
      },
      { status: 401 },
    );
  }

  const membership = user.memberships[0];
  const { rawToken, session } = await createPendingSession({
    userId: user.id,
    organizationId: membership.organizationId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createAuthAuditLog({
    organizationId: membership.organizationId,
    userId: user.id,
    actorName: user.name,
    actorRole: mapDbUserToAppUser(user).role,
    action: "login_success",
    target: user.email,
    severity: "info",
    result: "success",
    details: "Kullanıcı parolayla doğrulandı, 2FA bekleniyor.",
    ipAddress: meta.ipAddress,
    device: meta.userAgent,
  });

  const response = NextResponse.json({
    data: {
      requires2FA: true,
      authenticated: true,
      twoFactorVerified: false,
      sessionStartedAt: session.createdAt.toISOString(),
      user: mapDbUserToAppUser(user),
      organization: mapOrganizationToProfile(membership.organization),
      onboardingCompleted: membership.organization.onboardingCompleted,
    },
    meta: { requestId: meta.requestId },
    error: null,
  });

  setSessionCookie(response, rawToken);

  return response;
}
