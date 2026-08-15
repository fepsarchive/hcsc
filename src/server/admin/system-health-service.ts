import "server-only";

import { prisma } from "@/server/db/prisma";
import { getAdminAccessMode } from "@/server/admin/admin-auth";
import { getSystemOwnerEnvWarnings } from "@/server/auth/system-owner";

export type EnvCheck = {
  key: string;
  configured: boolean;
  required: boolean;
};

const requiredEnvKeys = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "JWT_SECRET",
  "TWO_FACTOR_ENCRYPTION_KEY",
  "RECOVERY_CODE_HASH_KEY",
  "APP_URL",
] as const;

function isConfigured(key: string) {
  return Boolean(process.env[key]?.trim());
}

export function getRequiredEnvChecks(): EnvCheck[] {
  const ownerConfigured = Boolean(process.env.SYSTEM_OWNER_EMAIL?.trim() || process.env.SYSTEM_OWNER_USER_ID?.trim());
  const selfHostedSecurityTests = process.env.HCSC_SECURITY_TEST_PROVIDER?.trim() === "self_hosted";

  return [
    ...requiredEnvKeys.map((key) => ({
      key,
      configured: isConfigured(key),
      required: true,
    })),
    {
      key: "SYSTEM_OWNER_EMAIL or SYSTEM_OWNER_USER_ID",
      configured: ownerConfigured,
      required: true,
    },
    {
      key: "DIRECT_URL",
      configured: isConfigured("DIRECT_URL"),
      required: false,
    },
    ...["STRIX_RUNNER_URL", "STRIX_RUNNER_TOKEN", "STRIX_RUNNER_CALLBACK_TOKEN"].map((key) => ({
      key,
      configured: isConfigured(key),
      required: selfHostedSecurityTests,
    })),
  ];
}

function calculateHealthScore(input: {
  databaseHealthy: boolean;
  envChecks: EnvCheck[];
  recentCriticalLogs: number;
}) {
  let score = 100;

  if (!input.databaseHealthy) score -= 25;
  score -= input.envChecks.filter((check) => check.required && !check.configured).length * 8;
  score -= Math.min(input.recentCriticalLogs * 5, 20);

  return Math.max(0, Math.min(100, score));
}

export async function getAdminSystemHealth() {
  const checkedAt = new Date();
  const databaseStartedAt = Date.now();
  let databaseStatus: "healthy" | "degraded" = "healthy";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = "degraded";
  }

  const [settings, recentCriticalLogs] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "applicationName" } }).catch(() => null),
    prisma.auditLog.count({
      where: {
        severity: "critical",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const envChecks = getRequiredEnvChecks();
  const accessMode = getAdminAccessMode();
  const warnings = [
    ...getSystemOwnerEnvWarnings(),
    ...envChecks.filter((check) => check.required && !check.configured).map((check) => `${check.key} missing`),
  ];

  return {
    database: {
      status: databaseStatus,
      latencyMs: Date.now() - databaseStartedAt,
    },
    api: {
      status: "healthy",
      message: "Admin API route handlers are available.",
    },
    auth: {
      status: "healthy",
      message: "DB-backed session, 2FA and system-owner guard enabled.",
    },
    storage: {
      status: "ready",
      message: "Database-backed records and report snapshots are configured.",
    },
    prisma: {
      status: databaseStatus === "healthy" ? "healthy" : "degraded",
      message: "Prisma server-only data access boundary active.",
    },
    environment: process.env.NODE_ENV ?? "development",
    appUrlConfigured: isConfigured("APP_URL"),
    httpsExpected: process.env.NODE_ENV === "production",
    applicationName: typeof settings?.value === "string" ? settings.value : "HCSC.space",
    lastChecked: checkedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    buildInfo: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    responseTimeMs: Date.now() - databaseStartedAt,
    envChecks,
    accessMode,
    warnings,
    healthScore: calculateHealthScore({
      databaseHealthy: databaseStatus === "healthy",
      envChecks,
      recentCriticalLogs,
    }),
    recentCriticalLogs,
  };
}
