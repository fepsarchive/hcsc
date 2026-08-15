export type SecurityTestAuthorizationSnapshot = {
  status: "active" | "expired" | "revoked";
  expiresAt: string | Date;
};

export type SecurityTestRunLifecycleStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

const allowedRunTransitions: Record<SecurityTestRunLifecycleStatus, readonly SecurityTestRunLifecycleStatus[]> = {
  queued: ["queued", "running", "completed", "failed", "cancelled"],
  running: ["running", "completed", "failed", "cancelled"],
  completed: ["completed"],
  failed: ["failed"],
  cancelled: ["cancelled"],
  blocked: ["blocked"],
};

export function isSecurityTestRunTransitionAllowed(
  current: SecurityTestRunLifecycleStatus,
  next: SecurityTestRunLifecycleStatus,
) {
  return allowedRunTransitions[current].includes(next);
}

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
