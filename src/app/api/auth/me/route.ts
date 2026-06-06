import { NextRequest, NextResponse } from "next/server";

import { getPermissionsForRole, mapDbUserToAppUser, mapOrganizationToProfile } from "@/server/auth/permissions";
import { buildRequestMeta, getSessionContext, getSessionTokenFromRequest } from "@/server/auth/session";
import { isSystemOwner } from "@/server/auth/system-owner";
import { isTwoFactorEnrolled } from "@/server/auth/two-factor";

export async function GET(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const session = await getSessionContext(getSessionTokenFromRequest(request));

  if (!session) {
    return NextResponse.json({
      data: {
        authenticated: false,
        requiresTwoFactor: false,
        twoFactorVerified: false,
        sessionStartedAt: null,
        user: null,
        organization: null,
        onboardingCompleted: false,
        twoFactorEnrolled: false,
        permissions: [],
      },
      meta: { requestId: meta.requestId },
      error: null,
    });
  }

  const twoFactorEnrolled = isTwoFactorEnrolled({
    secret: session.user.twoFactorSecret?.secret,
    enabledAt: session.user.twoFactorSecret?.enabledAt,
    enrolledAt: session.user.twoFactorSecret?.enrolledAt,
  });

  if (!session.is2FAVerified) {
    return NextResponse.json({
      data: {
        authenticated: false,
        requiresTwoFactor: true,
        twoFactorVerified: false,
        sessionStartedAt: session.createdAt.toISOString(),
        user: null,
        organization: null,
        onboardingCompleted: false,
        twoFactorEnrolled,
        redirectTo: "/verify-2fa",
        permissions: [],
      },
      meta: { requestId: meta.requestId },
      error: null,
    });
  }

  const user = mapDbUserToAppUser(session.user);
  const redirectTo = isSystemOwner(session.user)
    ? "/admin"
    : session.organization.onboardingCompleted
      ? "/dashboard"
      : "/onboarding";

  return NextResponse.json({
    data: {
      authenticated: true,
      requiresTwoFactor: false,
      twoFactorVerified: session.is2FAVerified,
      sessionStartedAt: session.createdAt.toISOString(),
      user,
      organization: mapOrganizationToProfile(session.organization),
      onboardingCompleted: session.organization.onboardingCompleted,
      twoFactorEnrolled,
      nextPath: redirectTo,
      redirectTo,
      permissions: getPermissionsForRole(session.user.role),
    },
    meta: { requestId: meta.requestId },
    error: null,
  });
}
