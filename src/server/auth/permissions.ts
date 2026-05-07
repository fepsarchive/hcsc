import type { Organization, User, UserRole as DbUserRole, UserStatus as DbUserStatus } from "@prisma/client";

import { rolePermissions } from "@/lib/permissions";
import { prisma } from "@/server/db/prisma";
import type { AppUser, OrganizationProfile, Permission, UserRole } from "@/types";

const dbRoleToClientRoleMap: Record<DbUserRole, UserRole> = {
  security_admin: "Security Admin",
  cloud_security_analyst: "Cloud Security Analyst",
  compliance_officer: "Compliance Officer",
  auditor: "Auditor",
  executive: "Executive",
};

const dbStatusToClientStatusMap: Record<DbUserStatus, AppUser["status"]> = {
  active: "active",
  invited: "invited",
  suspended: "suspended",
};

const cloudModeLabelMap: Record<Organization["cloudMode"], OrganizationProfile["cloudMode"]> = {
  private_cloud: "Private Cloud",
  public_cloud: "Public Cloud",
  hybrid_cloud: "Hybrid Cloud",
};

function buildAvatarInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function mapDbRoleToClientRole(role: DbUserRole): UserRole {
  return dbRoleToClientRoleMap[role];
}

export function mapDbUserToAppUser(user: Pick<User, "id" | "name" | "email" | "role" | "avatarInitials" | "department" | "mfaEnabled" | "status" | "lastLoginAt">): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: mapDbRoleToClientRole(user.role),
    avatarInitials: user.avatarInitials || buildAvatarInitials(user.name),
    department: user.department ?? "Security",
    mfaEnabled: user.mfaEnabled,
    status: dbStatusToClientStatusMap[user.status],
    lastLoginAt: user.lastLoginAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function mapOrganizationToProfile(
  organization: Pick<Organization, "id" | "name" | "plan" | "region" | "cloudMode" | "demoMode" | "complianceFrameworks">,
): OrganizationProfile {
  return {
    id: organization.id,
    name: organization.name,
    plan: organization.plan,
    region: organization.region,
    complianceFrameworks: Array.isArray(organization.complianceFrameworks)
      ? organization.complianceFrameworks.map((entry) => String(entry))
      : [],
    cloudMode: cloudModeLabelMap[organization.cloudMode],
    demoMode: organization.demoMode,
  };
}

export function getPermissionsForRole(role: DbUserRole): Permission[] {
  return rolePermissions[mapDbRoleToClientRole(role)];
}

export function hasServerPermission(role: DbUserRole, permission: Permission) {
  return getPermissionsForRole(role).includes(permission);
}

export async function recordUnauthorizedAction(input: {
  organizationId: string;
  userId?: string | null;
  actorName: string;
  actorRole: string;
  target: string;
  details: string;
  ipAddress?: string | null;
  device?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: "unauthorized_action_attempt",
      module: "Authorization",
      target: input.target,
      severity: "warning",
      result: "blocked",
      details: input.details,
      ipAddress: input.ipAddress ?? null,
      device: input.device ?? null,
    },
  });
}
