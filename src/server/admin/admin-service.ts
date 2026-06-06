import "server-only";

import type { PlatformRole, Prisma, UserStatus } from "@prisma/client";

import { mapDbRoleToClientRole } from "@/server/auth/permissions";
import { isSystemOwner } from "@/server/auth/system-owner";
import { prisma } from "@/server/db/prisma";
import {
  logAdminSecurityEvent,
  type AdminSessionContext,
} from "@/server/admin/admin-auth";
import { getAdminSystemHealth } from "@/server/admin/system-health-service";
export { getAdminSystemHealth } from "@/server/admin/system-health-service";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  productRole: string;
  platformRole: PlatformRole;
  isSystemOwner: boolean;
  status: UserStatus;
  mfaEnabled: boolean;
  department: string | null;
  organizationName: string | null;
  lastLoginAt: string | null;
  failedAttempts: number;
  createdAt: string;
};

export type AdminRecordRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  detail: string;
};

export type AdminSettingsPayload = {
  applicationName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  adminContactEmail: string;
  systemNoticeMessage: string;
  securityScanVisibility: boolean;
  publicStatusMessage: string;
};

type AdminUserEntity = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        organization: true;
      };
    };
  };
}>;

const settingDefaults: AdminSettingsPayload = {
  applicationName: "HCSC.space",
  maintenanceMode: false,
  registrationEnabled: true,
  adminContactEmail: "security.admin@hcsc.local",
  systemNoticeMessage: "HCSC v2 foundation operational.",
  securityScanVisibility: true,
  publicStatusMessage: "HCSC.space systems operational.",
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function readString(value: Prisma.JsonValue | null | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: Prisma.JsonValue | null | undefined, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function mapUserRow(user: AdminUserEntity): AdminUserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    productRole: mapDbRoleToClientRole(user.role),
    platformRole: user.platformRole,
    isSystemOwner: isSystemOwner(user),
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    department: user.department,
    organizationName: user.memberships[0]?.organization.name ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    failedAttempts: 0,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getAdminOverviewData() {
  const today = startOfToday();
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    newUsersToday,
    totalRecords,
    todayActivity,
    failedLoginAttempts,
    adminActions,
    lockedUsers,
    assetRiskGroups,
    eventStatusGroups,
    userGrowthGroups,
    activityGroups,
    authEventGroups,
    health,
    recentActivities,
    recentErrors,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.asset.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: today } } }),
    prisma.auditLog.count({ where: { action: "login_failed", createdAt: { gte: today } } }),
    prisma.auditLog.count({ where: { module: "Admin", createdAt: { gte: today } } }),
    prisma.user.count({ where: { status: "suspended" } }),
    prisma.asset.groupBy({ by: ["riskLevel"], _count: { _all: true } }),
    prisma.securityEvent.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.auditLog.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: ["login_success", "login_failed"] },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { action: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    getAdminSystemHealth(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        actorName: true,
        result: true,
        module: true,
        target: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [{ result: { in: ["failure", "blocked"] } }, { severity: { in: ["high", "critical"] } }],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        actorName: true,
        result: true,
        severity: true,
        details: true,
        createdAt: true,
      },
    }),
  ]);
  const dayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(date),
    };
  });
  const groupByDay = (items: Array<{ createdAt: Date; _count: { _all: number } }>) => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = item.createdAt.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + item._count._all);
    }
    return dayLabels.map((day) => ({ label: day.label, value: counts.get(day.key) ?? 0 }));
  };
  const authByDay = new Map<string, { label: string; success: number; failure: number }>(
    dayLabels.map((day) => [day.key, { label: day.label, success: 0, failure: 0 }]),
  );
  for (const event of authEventGroups) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const entry = authByDay.get(key);
    if (!entry) continue;
    if (event.action === "login_success") entry.success += 1;
    if (event.action === "login_failed") entry.failure += 1;
  }

  return {
    totalUsers,
    activeUsers,
    newUsersToday,
    totalRecords,
    todayActivity,
    failedLoginAttempts,
    adminActions,
    lockedUsers,
    systemStatus: "Operational",
    healthScore: health.healthScore,
    health,
    charts: {
      userGrowth: groupByDay(userGrowthGroups),
      activity: groupByDay(activityGroups),
      recordsByStatus: [
        ...assetRiskGroups.map((entry) => ({ label: `asset:${entry.riskLevel}`, value: entry._count._all })),
        ...eventStatusGroups.map((entry) => ({ label: `event:${entry.status}`, value: entry._count._all })),
      ],
      authEvents: Array.from(authByDay.values()),
    },
    recentActivities: recentActivities.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
    recentErrors: recentErrors.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function getAdminUsers(query = "") {
  const trimmed = query.trim();
  const users = await prisma.user.findMany({
    where: trimmed
      ? {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
            { department: { contains: trimmed, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: [{ platformRole: "desc" }, { createdAt: "asc" }],
    take: 100,
  });

  const failedAttempts = await prisma.auditLog.groupBy({
    by: ["target"],
    where: {
      action: "login_failed",
      target: { in: users.map((user) => user.email) },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    _count: { _all: true },
  });
  const failedByEmail = new Map(failedAttempts.map((entry) => [entry.target, entry._count._all]));

  return users.map((user) => ({
    ...mapUserRow(user),
    failedAttempts: failedByEmail.get(user.email) ?? 0,
  }));
}

export async function getAdminUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    user: mapUserRow(user),
    memberships: user.memberships.map((membership) => ({
      id: membership.id,
      role: mapDbRoleToClientRole(membership.role),
      organizationName: membership.organization.name,
      createdAt: membership.createdAt.toISOString(),
    })),
    sessions: user.sessions.map((session) => ({
      id: session.id,
      status: session.status,
      twoFactorVerified: session.is2FAVerified,
      ipAddress: session.ipAddress,
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    })),
    auditLogs: user.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      result: log.result,
      severity: log.severity,
      target: log.target,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export async function updateAdminUserPlatformRole(input: {
  session: AdminSessionContext;
  targetUserId: string;
  platformRole: PlatformRole;
  ipAddress?: string | null;
  device?: string | null;
}) {
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });

  if (!target) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (isSystemOwner(target) && input.platformRole !== "ADMIN") {
    throw new Error("System owner platform rolü USER yapılamaz.");
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { platformRole: input.platformRole },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  await logAdminSecurityEvent({
    session: input.session,
    action: "admin_user_role_updated",
    target: target.email,
    result: "success",
    severity: "info",
    details: `${target.email} platform rolü ${input.platformRole} olarak güncellendi.`,
    ipAddress: input.ipAddress,
    device: input.device,
    metadata: {
      targetUserId: target.id,
      previousRole: target.platformRole,
      nextRole: input.platformRole,
    },
  });

  return mapUserRow(updated);
}

export async function updateAdminUserStatus(input: {
  session: AdminSessionContext;
  targetUserId: string;
  status: UserStatus;
  ipAddress?: string | null;
  device?: string | null;
}) {
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });

  if (!target) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (isSystemOwner(target) && input.status !== "active") {
    throw new Error("System owner hesabı pasifleştirilemez.");
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { status: input.status },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (input.status !== "active") {
    await prisma.session.updateMany({
      where: { userId: target.id, status: { in: ["active", "pending_2fa"] } },
      data: { status: "revoked" },
    });
  }

  await logAdminSecurityEvent({
    session: input.session,
    action: "admin_user_status_updated",
    target: target.email,
    result: "success",
    severity: input.status === "active" ? "info" : "warning",
    details: `${target.email} durumu ${input.status} olarak güncellendi.`,
    ipAddress: input.ipAddress,
    device: input.device,
    metadata: {
      targetUserId: target.id,
      previousStatus: target.status,
      nextStatus: input.status,
    },
  });

  return mapUserRow(updated);
}

export async function getAdminRecords(): Promise<AdminRecordRow[]> {
  const [assets, events, reports] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        classification: true,
        riskLevel: true,
        owner: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.securityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        source: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        generatedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return [
    ...assets.map((asset) => ({
      id: asset.id,
      type: "Asset",
      title: asset.name,
      status: asset.riskLevel,
      owner: asset.owner,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
      detail: `${asset.classification} data asset`,
    })),
    ...events.map((event) => ({
      id: event.id,
      type: "Event",
      title: event.title,
      status: event.status,
      owner: event.source,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      detail: `${event.severity} security event`,
    })),
    ...reports.map((report) => ({
      id: report.id,
      type: "Report",
      title: report.title,
      status: report.status,
      owner: report.generatedBy ?? "HCSC",
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      detail: `${report.type} report snapshot`,
    })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getAdminLogs() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      actorName: true,
      actorRole: true,
      module: true,
      result: true,
      severity: true,
      target: true,
      details: true,
      ipAddress: true,
      device: true,
      metadata: true,
      userId: true,
      createdAt: true,
    },
  });

  return logs.map((log) => ({
    ...log,
    actorUserId: log.userId,
    actorEmail: log.actorName.includes("@") ? log.actorName : null,
    targetType: log.module,
    targetId: log.target,
    createdAt: log.createdAt.toISOString(),
    error: log.result === "failure" || log.result === "blocked" ? log.details : null,
  }));
}

export async function getAdminSettings(): Promise<AdminSettingsPayload> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.keys(settingDefaults) } },
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    applicationName: readString(values.get("applicationName"), settingDefaults.applicationName),
    maintenanceMode: readBoolean(values.get("maintenanceMode"), settingDefaults.maintenanceMode),
    registrationEnabled: readBoolean(values.get("registrationEnabled"), settingDefaults.registrationEnabled),
    adminContactEmail: readString(values.get("adminContactEmail"), settingDefaults.adminContactEmail),
    systemNoticeMessage: readString(values.get("systemNoticeMessage"), settingDefaults.systemNoticeMessage),
    securityScanVisibility: readBoolean(values.get("securityScanVisibility"), settingDefaults.securityScanVisibility),
    publicStatusMessage: readString(values.get("publicStatusMessage"), settingDefaults.publicStatusMessage),
  };
}

export async function updateAdminSettings(input: {
  session: AdminSessionContext;
  settings: AdminSettingsPayload;
  ipAddress?: string | null;
  device?: string | null;
}) {
  const entries = Object.entries(input.settings) as Array<[keyof AdminSettingsPayload, string | boolean]>;

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: {
          value,
          updatedById: input.session.userId,
        },
        create: {
          key,
          value,
          description: `Admin setting: ${key}`,
          updatedById: input.session.userId,
        },
      }),
    ),
  );

  await logAdminSecurityEvent({
    session: input.session,
    action: "admin_settings_updated",
    target: "app_settings",
    result: "success",
    severity: input.settings.maintenanceMode ? "warning" : "info",
    details: "Admin uygulama ayarları güncellendi.",
    ipAddress: input.ipAddress,
    device: input.device,
    metadata: input.settings,
  });

  return getAdminSettings();
}
