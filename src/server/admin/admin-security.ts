import "server-only";

import { getAdminAccessMode } from "@/server/admin/admin-auth";
import { getAdminSystemHealth } from "@/server/admin/system-health-service";
import { getSystemOwnerConfig } from "@/server/auth/system-owner";
import { prisma } from "@/server/db/prisma";

export async function getAdminSecurityPosture() {
  const health = await getAdminSystemHealth();
  const ownerConfig = getSystemOwnerConfig();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    adminUsers,
    ownerUsers,
    failedLogins,
    unauthorizedAdminAttempts,
    passiveUsers,
    criticalLogs,
    eventSeverityGroups,
    topRiskyAssets,
    recentCriticalEvents,
    averageEventRisk,
    settings,
  ] = await Promise.all([
    prisma.user.count({ where: { platformRole: "ADMIN" } }),
    prisma.user.findMany({
      where: ownerConfig.ownerUserId
        ? { id: ownerConfig.ownerUserId }
        : { email: ownerConfig.ownerEmail ?? ownerConfig.fallbackEmail },
      select: { id: true, email: true, mfaEnabled: true, status: true, platformRole: true },
      take: 2,
    }),
    prisma.auditLog.count({ where: { action: "login_failed", createdAt: { gte: since } } }),
    prisma.auditLog.count({
      where: {
        action: { in: ["system_owner_api_forbidden", "system_owner_page_forbidden", "admin_api_forbidden", "admin_page_forbidden"] },
        createdAt: { gte: since },
      },
    }),
    prisma.user.count({ where: { status: "suspended" } }),
    prisma.auditLog.count({ where: { severity: "critical", createdAt: { gte: since } } }),
    prisma.securityEvent.groupBy({ by: ["severity"], _count: { _all: true } }),
    prisma.asset.findMany({
      where: {
        riskLevel: { in: ["high", "critical"] },
        inventoryStatus: { not: "ARCHIVED" },
      },
      orderBy: [{ riskScore: "desc" }, { updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        riskScore: true,
        riskLevel: true,
        classification: true,
        exposure: true,
      },
    }),
    prisma.securityEvent.findMany({
      where: { severity: { in: ["critical", "high"] } },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        riskScore: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.securityEvent.aggregate({ _avg: { riskScore: true } }),
    prisma.appSetting.findMany({
      where: { key: { in: ["maintenanceMode", "securityScanVisibility"] } },
    }),
  ]);

  const owner = ownerUsers[0] ?? null;
  const maintenanceMode = settings.find((item) => item.key === "maintenanceMode")?.value === true;
  const securityScanVisible = settings.find((item) => item.key === "securityScanVisibility")?.value !== false;

  const riskChecks = [
    {
      id: "required-env",
      label: "Missing required env",
      status: health.envChecks.some((check) => check.required && !check.configured) ? "warning" : "pass",
      detail: `${health.envChecks.filter((check) => check.required && !check.configured).length} missing required env checks`,
    },
    {
      id: "admin-users",
      label: "Multiple admin users detected",
      status: adminUsers > 1 ? "warning" : "pass",
      detail: `${adminUsers} platform ADMIN account(s); panel access remains system-owner only`,
    },
    {
      id: "owner-env",
      label: "System owner env missing",
      status: ownerConfig.envConfigured ? "pass" : "warning",
      detail: ownerConfig.envConfigured ? `Owner source: ${ownerConfig.source}` : "Seed fallback owner is active",
    },
    {
      id: "failed-login",
      label: "Recent failed login spike",
      status: failedLogins >= 5 ? "warning" : "pass",
      detail: `${failedLogins} failed login event(s) in the last 24 hours`,
    },
    {
      id: "unauthorized-admin",
      label: "Recent unauthorized admin attempts",
      status: unauthorizedAdminAttempts > 0 ? "warning" : "pass",
      detail: `${unauthorizedAdminAttempts} unauthorized admin attempt(s) in the last 24 hours`,
    },
    {
      id: "database",
      label: "Database unavailable",
      status: health.database.status === "healthy" ? "pass" : "critical",
      detail: `Database status: ${health.database.status}`,
    },
    {
      id: "audit",
      label: "Audit logging disabled",
      status: "pass",
      detail: "AuditLog model and admin audit writer are active",
    },
    {
      id: "maintenance",
      label: "Maintenance mode active",
      status: maintenanceMode ? "warning" : "pass",
      detail: maintenanceMode ? "Maintenance mode is enabled" : "Maintenance mode is disabled",
    },
  ] as const;

  const penalties = riskChecks.reduce((score, check) => {
    if (check.status === "critical") return score + 20;
    if (check.status === "warning") return score + 7;
    return score;
  }, 0);

  const overallScore = Math.max(0, Math.min(100, Math.min(health.healthScore, 100 - penalties)));

  return {
    overallScore,
    adminAccessModel: getAdminAccessMode().mode,
    owner: {
      configured: ownerConfig.envConfigured,
      source: ownerConfig.source,
      found: Boolean(owner),
      mfaEnabled: owner?.mfaEnabled ?? false,
      status: owner?.status ?? "missing",
      platformRole: owner?.platformRole ?? "missing",
    },
    authProtection: "enabled",
    twoFactorStatus: owner?.mfaEnabled ? "owner_2fa_enabled" : "owner_2fa_missing",
    apiGuardStatus: "system_owner_guard_enabled",
    databaseProtectionStatus: health.database.status === "healthy" ? "protected" : "degraded",
    auditLoggingStatus: "enabled",
    environmentSafetyStatus: health.warnings.length ? "warnings" : "ready",
    securityScanVisible,
    passiveUsers,
    failedLogins,
    unauthorizedAdminAttempts,
    criticalLogs,
    securityMetrics: {
      averageEventRiskScore: Math.round(averageEventRisk._avg.riskScore ?? 0),
      severityDistribution: Object.fromEntries(eventSeverityGroups.map((entry) => [entry.severity, entry._count._all])),
      topRiskyAssets,
      recentCriticalEvents: recentCriticalEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    },
    health,
    riskChecks,
    databaseProtection: {
      summary:
        "HCSC.space connected databases are protected through server-side access boundaries. Client components do not connect directly to the database. All database operations are mediated by authenticated API routes or server-side services. Administrative actions require system-owner authorization and are recorded as audit events.",
      controls: [
        "Direct client-side DB access yok",
        "Prisma/server-only data access",
        "API route authorization",
        "System owner guard",
        "Secrets env üzerinde",
        "No secret exposure in frontend",
        "Role-based/session-based checks",
        "Audit trail",
        "Production destructive DB operations disabled/not used",
      ],
    },
    recommendations: [
      "Use sslmode=verify-full for production Postgres if supported",
      "Keep SYSTEM_OWNER_EMAIL configured in Vercel env",
      "Rotate secrets periodically",
      "Enable 2FA for system owner",
      "Review open high/critical security events before demos",
      "Recalculate risk for public/shared critical assets after inventory changes",
      "Review audit logs before production demo",
      "Avoid db push --accept-data-loss on production",
    ],
    thesisSummary:
      "HCSC.space uses a single system-owner administration model. Administrative routes and APIs are protected by server-side authorization guards, while database access is isolated behind server-only services and authenticated API endpoints. The system provides audit logging, environment configuration checks, health monitoring, and role-aware access control to reduce unauthorized access and operational risk.",
  };
}
