import { NextRequest, NextResponse } from "next/server";

import { getPermissionsForRole, mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { buildRequestMeta, getSessionContext, getSessionTokenFromRequest } from "@/server/auth/session";

export async function GET(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const session = await getSessionContext(getSessionTokenFromRequest(request));

  if (!session) {
    return NextResponse.json({
      data: {
        authenticated: false,
        twoFactorVerified: false,
        sessionStartedAt: null,
        user: null,
        organization: null,
        onboardingCompleted: false,
        permissions: [],
      },
      meta: { requestId: meta.requestId },
      error: null,
    });
  }

  return NextResponse.json({
    data: {
      authenticated: true,
      twoFactorVerified: session.is2FAVerified,
      sessionStartedAt: session.createdAt.toISOString(),
      user: mapDbUserToAppUser(session.user),
      organization: mapOrganizationToProfile(session.organization),
      onboardingCompleted: session.organization.onboardingCompleted,
      permissions: getPermissionsForRole(session.user.role),
    },
    meta: { requestId: meta.requestId },
    error: null,
  });
}
