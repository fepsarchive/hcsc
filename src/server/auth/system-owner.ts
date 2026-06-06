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

  return {
    ownerUserId,
    ownerEmail,
    fallbackEmail: SYSTEM_OWNER_FALLBACK_EMAIL,
    source: ownerUserId ? "SYSTEM_OWNER_USER_ID" : ownerEmail ? "SYSTEM_OWNER_EMAIL" : "seed_fallback",
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

  return user.email.toLowerCase() === config.fallbackEmail;
}

export function getSystemOwnerEnvWarnings() {
  const config = getSystemOwnerConfig();
  const warnings: string[] = [];

  if (!config.envConfigured) {
    warnings.push("System owner env missing; seed fallback owner is active.");
  }

  return warnings;
}
