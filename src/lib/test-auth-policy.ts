export const DEFAULT_TEST_AUTH_BYPASS_EMAIL = "ui.test@hcsc.local";

export function isTestAuthBypassAllowed(input: {
  nodeEnv?: string;
  enabled?: string;
  email: string;
  configuredEmail?: string;
  platformRole: "USER" | "ADMIN";
  isSystemOwner: boolean;
}) {
  if (input.nodeEnv === "production") return false;
  if (input.enabled?.trim().toLowerCase() === "false") return false;
  if (input.platformRole !== "USER" || input.isSystemOwner) return false;

  const allowedEmail = (input.configuredEmail?.trim() || DEFAULT_TEST_AUTH_BYPASS_EMAIL).toLowerCase();
  return input.email.trim().toLowerCase() === allowedEmail;
}
