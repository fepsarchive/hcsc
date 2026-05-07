import type { NextRequest } from "next/server";

import { apiError } from "@/server/api/response";
import { getPermissionsForRole, hasServerPermission, mapDbUserToAppUser, mapOrganizationToProfile, recordUnauthorizedAction } from "@/server/auth/permissions";
import { buildRequestMeta, getSessionContext, getSessionTokenFromRequest } from "@/server/auth/session";
import type { Permission } from "@/types";

export async function requireApiAuth(
  request: NextRequest,
  options: {
    permission?: Permission;
    target?: string;
    requireTwoFactor?: boolean;
  } = {},
) {
  const meta = buildRequestMeta(request);
  const session = await getSessionContext(getSessionTokenFromRequest(request));

  if (!session) {
    return {
      ok: false as const,
      response: apiError(meta.requestId, 401, "UNAUTHENTICATED", "Oturum bulunamadı."),
    };
  }

  if ((options.requireTwoFactor ?? true) && !session.is2FAVerified) {
    return {
      ok: false as const,
      response: apiError(meta.requestId, 403, "TWO_FACTOR_REQUIRED", "Bu işlem için 2FA doğrulaması gerekli."),
    };
  }

  if (options.permission && !hasServerPermission(session.user.role, options.permission)) {
    await recordUnauthorizedAction({
      organizationId: session.organizationId,
      userId: session.userId,
      actorName: session.user.name,
      actorRole: mapDbUserToAppUser(session.user).role,
      target: options.target ?? options.permission,
      details: `${options.permission} yetkisi olmadan işlem denendi.`,
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });

    return {
      ok: false as const,
      response: apiError(meta.requestId, 403, "FORBIDDEN", "Bu işlem için yetkin yok."),
    };
  }

  return {
    ok: true as const,
    context: {
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      session,
      permissions: getPermissionsForRole(session.user.role),
      user: mapDbUserToAppUser(session.user),
      organization: mapOrganizationToProfile(session.organization),
    },
  };
}
