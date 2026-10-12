import "server-only";

type AdminIdentity = {
  id: string;
  email: string;
  platformRole: string;
  status: string;
};

// Operator-managed exception, never derived from request fields or a public env.
// Both identifiers are required so deleting/re-registering an email grants nothing.
export function isConfiguredAdmin(user: AdminIdentity) {
  const id = process.env.HCSC_PASSWORD_ONLY_ADMIN_USER_ID?.trim();
  const email = process.env.HCSC_PASSWORD_ONLY_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(
    id && email && user.id === id && user.email.toLowerCase() === email &&
    user.platformRole === "ADMIN" && user.status === "active",
  );
}

// Turning off the MFA exception must not remove the designated admin's role.
// Admin gates still require a completed (now real-MFA) session.
export function isPasswordOnlyAdmin(user: AdminIdentity) {
  return process.env.HCSC_PASSWORD_ONLY_ADMIN_ENABLED === "true" && isConfiguredAdmin(user);
}

export function hasCompletedAuthentication(session: {
  is2FAVerified: boolean;
  twoFactorExempt?: boolean;
}) {
  return session.is2FAVerified || session.twoFactorExempt === true;
}
