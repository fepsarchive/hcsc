import "server-only";

import type { User } from "@prisma/client";

export const SYSTEM_OWNER_FALLBACK_EMAIL = "security.admin@hcsc.local";

type OwnerUser = Pick<User, "id" | "email">;

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSystemOwnerConfig() {
  const ownerUserId = clean(process.env.SYSTEM_OWNER_USER_ID);
  const ownerEmail = clean(process.env.SYSTEM_OWNER_EMAIL)?.toLowerCase() ?? null;
  const fallbackEnabled = process.env.NODE_ENV !== "production";

  return {
    ownerUserId,
    ownerEmail,
    fallbackEmail: SYSTEM_OWNER_FALLBACK_EMAIL,
    fallbackEnabled,
    source: ownerUserId
      ? "SYSTEM_OWNER_USER_ID"
      : ownerEmail
        ? "SYSTEM_OWNER_EMAIL"
        : fallbackEnabled
          ? "seed_fallback"
          : "unconfigured",
    envConfigured: Boolean(ownerUserId || ownerEmail),
  };
}

export function isSystemOwner(user: OwnerUser | null | undefined) {
  if (!user) return false;

  const config = getSystemOwnerConfig();

  if (config.ownerUserId) {
    return user.id === config.ownerUserId;
  }

  if (config.ownerEmail) {
    return user.email.toLowerCase() === config.ownerEmail;
  }

  return config.fallbackEnabled && user.email.toLowerCase() === config.fallbackEmail;
}

export function getSystemOwnerEnvWarnings() {
  const config = getSystemOwnerConfig();
  const warnings: string[] = [];

  if (!config.envConfigured) {
    warnings.push(
      config.fallbackEnabled
        ? "System owner env missing; non-production seed fallback owner is active."
        : "System owner env missing; system-owner access is disabled.",
    );
  }

  return warnings;
}
