import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuditResult, AuditSeverity, Prisma, User } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

export const SESSION_COOKIE_NAME = "hcsc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function getSessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, buildCookieOptions());
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...buildCookieOptions(),
    maxAge: 0,
  });
}

export async function createPendingSession(input: {
  userId: string;
  organizationId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      tokenHash,
      status: "pending_2fa",
      is2FAVerified: false,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt,
    },
  });

  return { rawToken, session };
}

export async function getSessionContext(rawToken: string | null) {
  if (!rawToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(rawToken),
    },
    include: {
      user: {
        include: {
          twoFactorSecret: true,
        },
      },
      organization: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.status === "revoked" || session.status === "expired" || session.expiresAt.getTime() <= Date.now()) {
    if (session.status !== "expired") {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "expired" },
      });
    }

    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return session;
}

export async function markSessionTwoFactorVerified(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "active",
      is2FAVerified: true,
      lastSeenAt: new Date(),
    },
  });
}

export async function revokeSession(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "revoked",
      updatedAt: new Date(),
    },
  });
}

export async function revokeSessionByToken(rawToken: string | null) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session) {
    return null;
  }

  return revokeSession(session.id);
}

export function buildRequestMeta(request: NextRequest) {
  return {
    requestId: randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function createAuthAuditLog(input: {
  organizationId: string;
  userId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  result: AuditResult;
  severity: AuditSeverity;
  details: string;
  ipAddress?: string | null;
  device?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.action,
      module: "Authentication",
      target: input.target,
      result: input.result,
      severity: input.severity,
      details: input.details,
      ipAddress: input.ipAddress ?? null,
      device: input.device ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export type AuthenticatedSessionContext = Awaited<ReturnType<typeof getSessionContext>>;
export type AuthenticatedUser = User;
