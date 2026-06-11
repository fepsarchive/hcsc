import type { AppUser, AuthState } from "@/types";

export const publicRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-2fa",
  "/onboarding",
  "/accept-invite",
]);

export const anonymousAccessibleRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
]);

export function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isAlwaysAccessiblePublicPath(pathname: string) {
  return (
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/accept-invite"
  );
}

export function isScrollablePublicPath(pathname: string) {
  return (
    pathname === "/onboarding" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/accept-invite" ||
    pathname === "/login" ||
    pathname === "/verify-2fa"
  );
}

export function resolveAppShellRedirect(input: {
  pathname: string;
  auth: AuthState;
  currentUser: AppUser | null;
  onboardingCompleted: boolean;
}) {
  const { pathname, auth, currentUser, onboardingCompleted } = input;

  if (!auth.hydrated || isAdminPath(pathname)) {
    return null;
  }

  if (!auth.isAuthenticated) {
    if (auth.requiresTwoFactor) {
      return pathname === "/verify-2fa" ? null : "/verify-2fa";
    }

    return anonymousAccessibleRoutes.has(pathname) ? null : "/login";
  }

  if (pathname === "/accept-invite") {
    return auth.is2FAVerified ? null : "/verify-2fa";
  }

  if (!auth.is2FAVerified) {
    return pathname === "/verify-2fa" ? null : "/verify-2fa";
  }

  if (!onboardingCompleted) {
    return pathname === "/onboarding" ? null : "/onboarding";
  }

  if (publicRoutes.has(pathname) && !isAlwaysAccessiblePublicPath(pathname)) {
    return currentUser?.isSystemOwner ? "/admin" : "/dashboard";
  }

  return null;
}
