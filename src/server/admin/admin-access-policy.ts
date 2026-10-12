import "server-only";
import { isSystemOwner } from "@/server/auth/system-owner";
import { hasCompletedAuthentication, isConfiguredAdmin } from "@/server/auth/password-only-admin";

export function isSystemOwnerSession(session: {
  is2FAVerified: boolean;
  twoFactorExempt?: boolean;
  user: { id: string; email: string; status: string; platformRole: string };
} | null) {
  return session !== null && hasCompletedAuthentication(session) &&
    session.user.status === "active" &&
    (isSystemOwner(session.user) || isConfiguredAdmin(session.user));
}
