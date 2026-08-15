import "server-only";

import type { PlatformRole, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiError } from "@/server/api/response";
import { mapDbUserToAppUser } from "@/server/auth/permissions";
import {
  buildRequestMeta,
  getSessionContext,
  getSessionTokenFromRequest,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getSystemOwnerConfig, isSystemOwner } from "@/server/auth/system-owner";
import { createSecurityEvent } from "@/server/security/security-event-service";

export type AdminSessionContext = NonNullable<Awaited<ReturnType<typeof getSessionContext>>>;

export function isSystemOwnerSession(session: AdminSessionContext | null) {
  return (
    session?.is2FAVerified === true &&
    session.user.status === "active" &&
    isSystemOwner(session.user)
  );
}

export async function requireSystemOwnerPageSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const session = await getSessionContext(rawToken);

  if (!session) {
    redirect("/login");
  }

  if (!session.is2FAVerified) {
    redirect("/verify-2fa");
  }

  if (!isSystemOwnerSession(session)) {
    await logAdminSecurityEvent({
      session,
      action: "system_owner_page_forbidden",
      target: "/admin",
      result: "blocked",
      severity: "warning",
      details: "System owner olmayan kullanıcı admin sayfasına erişmeye çalıştı.",
    });
    redirect("/dashboard");
  }

  return session;
}

export const requireAdminPageSession = requireSystemOwnerPageSession;

export async function requireSystemOwnerApiAuth(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const session = await getSessionContext(getSessionTokenFromRequest(request));

  if (!session) {
    return {
      ok: false as const,
      response: apiError(meta.requestId, 401, "UNAUTHENTICATED", "Admin işlemi için oturum gerekli."),
    };
  }

  if (!session.is2FAVerified) {
    return {
      ok: false as const,
      response: apiError(meta.requestId, 403, "TWO_FACTOR_REQUIRED", "Admin işlemi için 2FA doğrulaması gerekli."),
    };
  }

  if (!isSystemOwnerSession(session)) {
    await logAdminSecurityEvent({
      session,
      action: "system_owner_api_forbidden",
      target: request.nextUrl.pathname,
      result: "blocked",
      severity: "warning",
      details: "System owner olmayan kullanıcı admin API çağrısı yapmaya çalıştı.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return {
      ok: false as const,
      response: apiError(meta.requestId, 403, "FORBIDDEN", "Bu işlem için system owner yetkisi gerekli."),
    };
  }

  return {
    ok: true as const,
    requestId: meta.requestId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    session,
    user: mapDbUserToAppUser(session.user),
  };
}

export const requireAdminApiAuth = requireSystemOwnerApiAuth;

export function getAdminAccessMode() {
  const config = getSystemOwnerConfig();

  return {
    mode: "System Owner Only",
    ownerSource: config.source,
    envConfigured: config.envConfigured,
  };
}

export async function countActivePlatformAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      platformRole: "ADMIN" satisfies PlatformRole,
      status: "active",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function logAdminSecurityEvent(input: {
  session: AdminSessionContext;
  action: string;
  target: string;
  result: "success" | "failure" | "blocked";
  severity: "info" | "warning" | "high" | "critical";
  details: string;
  ipAddress?: string | null;
  device?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.session.organizationId,
      userId: input.session.userId,
      actorName: input.session.user.name,
      actorRole: `${mapDbUserToAppUser(input.session.user).role} / ${input.session.user.platformRole}`,
      action: input.action,
      module: "Admin",
      target: input.target,
      result: input.result,
      severity: input.severity,
      details: input.details,
      ipAddress: input.ipAddress ?? input.session.ipAddress ?? null,
      device: input.device ?? input.session.userAgent ?? null,
      metadata: input.metadata,
    },
  });

  await createAdminSecurityEvent(input).catch(() => null);
}

async function createAdminSecurityEvent(input: {
  session: AdminSessionContext;
  action: string;
  target: string;
  result: "success" | "failure" | "blocked";
  severity: "info" | "warning" | "high" | "critical";
  details: string;
  ipAddress?: string | null;
  device?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const category =
    input.action.includes("forbidden")
      ? "admin_access_denied"
      : input.action.includes("role")
        ? "role_changed"
        : input.action.includes("status")
          ? "status_changed"
          : input.action.includes("settings")
            ? "settings_changed"
            : "admin_access_granted";

  if (
    ![
      "admin_access_denied",
      "admin_access_granted",
      "role_changed",
      "status_changed",
      "settings_changed",
    ].includes(category)
  ) {
    return;
  }

  const eventSeverity =
    input.severity === "critical" || input.severity === "high"
      ? input.severity
      : input.result === "blocked"
        ? "medium"
        : "info";

  await createSecurityEvent({
    organizationId: input.session.organizationId,
    actorUserId: input.session.userId,
    actorEmail: input.session.user.email,
    source: "Admin",
    category,
    type: input.action.toUpperCase(),
    title:
      category === "admin_access_denied"
        ? "Unauthorized admin access attempt"
        : category === "role_changed"
          ? "Admin role changed"
          : category === "status_changed"
            ? "Admin status changed"
            : category === "settings_changed"
              ? "Admin settings changed"
              : "Admin access granted",
    description: input.details,
    severity: eventSeverity,
    target: input.target,
    targetType: "admin",
    ipAddress: input.ipAddress ?? input.session.ipAddress ?? null,
    userAgent: input.device ?? input.session.userAgent ?? null,
    metadata: {
      action: input.action,
      result: input.result,
      metadata: input.metadata,
    },
    notify: input.result === "blocked" || category === "settings_changed" || category === "role_changed" || category === "status_changed",
  });
}
