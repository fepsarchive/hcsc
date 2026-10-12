import "server-only";

import { assertDatabaseIsolation } from "@/lib/database-isolation";

export type DependencyStatus = "healthy" | "degraded" | "unavailable" | "not_configured";

export type DependencyProbe = {
  status: DependencyStatus;
  latencyMs: number;
  message: string;
};

const PROBE_TIMEOUT_MS = 3_500;

function elapsed(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function configured(...keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

function safeBaseUrl(value: string | undefined, allowLocalhost = false) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (url.protocol !== "https:" && !(allowLocalhost && local && url.protocol === "http:")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function probeDatabase(): Promise<DependencyProbe> {
  const startedAt = Date.now();
  if (!process.env.DATABASE_URL?.trim()) {
    return { status: "not_configured", latencyMs: 0, message: "Database is not configured." };
  }
  try {
    // Check on every probe, including when the Prisma module is already cached.
    assertDatabaseIsolation(process.env);
  } catch {
    return { status: "unavailable", latencyMs: elapsed(startedAt), message: "Database target configuration was rejected." };
  }
  try {
    // Initialization can fail. Keep it inside the boundary so readiness still
    // returns a sanitized 503 instead of crashing while importing the route.
    const { prisma } = await import("@/server/db/prisma");
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT "id", "tokenCiphertext", "lastCheck" FROM "ConnectedDomain" LIMIT 0`;
    await prisma.$queryRaw`SELECT "id", "signingSecretCiphertext" FROM "IntegrationEndpoint" LIMIT 0`;
    // LIMIT 0 validates the auth schema without reading user or credential rows.
    await prisma.$queryRaw`SELECT u."platformRole", f."enrolledAt", f."lastVerifiedAt", f."lastVerifiedStep",
      p."tokenHash", i."tokenHash", a."key", s."usageType", s."defaultCurrency", s."setupCompletedAt"
      FROM "User" u, "TwoFactorSecret" f, "PasswordResetToken" p,
        "OrganizationInvite" i, "AppSetting" a, "OrganizationSettings" s LIMIT 0`;
    return { status: "healthy", latencyMs: elapsed(startedAt), message: "Database query completed." };
  } catch {
    return { status: "unavailable", latencyMs: elapsed(startedAt), message: "Database query failed." };
  }
}

export async function probeCache(): Promise<DependencyProbe> {
  const startedAt = Date.now();
  const baseUrl = safeBaseUrl(process.env.UPSTASH_REDIS_REST_URL);
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) {
    return { status: "not_configured", latencyMs: 0, message: "Remote rate-limit cache is not configured." };
  }

  try {
    const response = await fetch(`${baseUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["PING"]]),
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const payload: unknown = await response.json();
    const healthy = response.ok && Array.isArray(payload) && payload[0]?.result === "PONG" && !payload[0]?.error;
    return {
      status: healthy ? "healthy" : "degraded",
      latencyMs: elapsed(startedAt),
      message: healthy ? "Remote rate-limit cache responded with PONG." : `Cache probe failed (HTTP ${response.status}).`,
    };
  } catch {
    return { status: "unavailable", latencyMs: elapsed(startedAt), message: "Remote rate-limit cache did not respond." };
  }
}

export async function probeMailProvider(): Promise<DependencyProbe> {
  const startedAt = Date.now();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !configured("MAIL_FROM", "APP_URL")) {
    return { status: "not_configured", latencyMs: 0, message: "Transactional email is not fully configured." };
  }

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return {
      status: response.ok ? "healthy" : "degraded",
      latencyMs: elapsed(startedAt),
      message: response.ok ? "Email provider API responded; delivery is not verified by this read-only probe." : response.status === 403 ? "Token cannot list domains (possibly send-only); actual delivery remains unverified." : `Email provider returned ${response.status}.`,
    };
  } catch {
    return { status: "unavailable", latencyMs: elapsed(startedAt), message: "Email provider API did not respond." };
  }
}

export async function probeStrixProvider(): Promise<DependencyProbe> {
  const startedAt = Date.now();
  const mode = process.env.HCSC_SECURITY_TEST_PROVIDER?.trim().toLowerCase() ?? "demo";

  if (mode === "managed") {
    const baseUrl = safeBaseUrl(process.env.STRIX_API_BASE_URL ?? "https://app.strix.ai/api/v1");
    const token = process.env.STRIX_API_TOKEN?.trim();
    if (!baseUrl || !token) {
      return { status: "not_configured", latencyMs: 0, message: "Managed Strix API is not configured." };
    }
    try {
      const response = await fetch(`${baseUrl}/scans?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      return {
        status: response.ok ? "healthy" : "degraded",
        latencyMs: elapsed(startedAt),
        message: response.ok ? "Managed Strix API responded." : `Managed Strix API returned ${response.status}.`,
      };
    } catch {
      return { status: "unavailable", latencyMs: elapsed(startedAt), message: "Managed Strix API did not respond." };
    }
  }

  if (mode === "self_hosted") {
    const baseUrl = safeBaseUrl(process.env.STRIX_RUNNER_URL, true);
    const token = process.env.STRIX_RUNNER_TOKEN?.trim();
    const callbackToken = process.env.STRIX_RUNNER_CALLBACK_TOKEN?.trim();
    if (!baseUrl || !token || !callbackToken) {
      return { status: "not_configured", latencyMs: 0, message: "Self-hosted Strix runner is not fully configured." };
    }
    const healthPath = process.env.STRIX_RUNNER_HEALTH_PATH?.trim() || "/healthz";
    try {
      const response = await fetch(`${baseUrl}${healthPath.startsWith("/") ? healthPath : `/${healthPath}`}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      return {
        status: response.ok ? "healthy" : "degraded",
        latencyMs: elapsed(startedAt),
        message: response.ok ? "Self-hosted Strix runner responded." : `Strix runner returned ${response.status}.`,
      };
    } catch {
      return { status: "unavailable", latencyMs: elapsed(startedAt), message: "Self-hosted Strix runner did not respond." };
    }
  }

  return { status: "not_configured", latencyMs: 0, message: "Synthetic demo provider is selected." };
}

export async function getDependencyHealth() {
  const [database, cache, mail, strix] = await Promise.all([
    probeDatabase(),
    probeCache(),
    probeMailProvider(),
    probeStrixProvider(),
  ]);
  return { database, cache, mail, strix };
}
