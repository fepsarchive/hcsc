export type SecurityTestAuthorizationSnapshot = {
  status: "active" | "expired" | "revoked";
  expiresAt: string | Date;
};

export function isSecurityTestAuthorizationActive(
  authorization: SecurityTestAuthorizationSnapshot | null | undefined,
  now = new Date(),
) {
  if (!authorization || authorization.status !== "active") return false;
  return new Date(authorization.expiresAt).getTime() > now.getTime();
}

export function getEffectiveSecurityTestAuthorizationStatus(
  authorization: SecurityTestAuthorizationSnapshot | null | undefined,
  now = new Date(),
): SecurityTestAuthorizationSnapshot["status"] {
  if (!authorization) return "expired";
  if (authorization.status === "revoked") return "revoked";
  return new Date(authorization.expiresAt).getTime() > now.getTime() ? "active" : "expired";
}

export function normalizeSecurityTestScope(value: string | string[]) {
  const entries = Array.isArray(value) ? value : value.split(/\r?\n|,/);
  return [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))].slice(0, 50);
}
