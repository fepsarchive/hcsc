import { NextRequest, NextResponse } from "next/server";

import { mapDbUserToAppUser } from "@/server/auth/permissions";
import { buildRequestMeta, clearSessionCookie, createAuthAuditLog, getSessionContext, getSessionTokenFromRequest, revokeSessionByToken } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const rawToken = getSessionTokenFromRequest(request);
  const session = await getSessionContext(rawToken);

  if (session) {
    await revokeSessionByToken(rawToken);
    await createAuthAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      actorName: session.user.name,
      actorRole: mapDbUserToAppUser(session.user).role,
      action: "logout",
      target: "session",
      severity: "info",
      result: "success",
      details: "Kullanıcı oturumu kapatıldı.",
      ipAddress: meta.ipAddress,
      device: meta.userAgent,
    });
  }

  const response = NextResponse.json({
    data: { success: true },
    meta: { requestId: meta.requestId },
    error: null,
  });

  clearSessionCookie(response);

  return response;
}
