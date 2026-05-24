import { createHash, randomBytes } from "node:crypto";

import type { Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { mapDbRoleToClientRole, mapOrganizationToProfile } from "@/server/auth/permissions";
import { createAuthAuditLog } from "@/server/auth/session";
import { sendTeamInviteMail } from "@/server/mail/resend-mailer";

const TEAM_INVITE_EXPIRES_MS = 1000 * 60 * 60 * 24 * 7;

type TeamActor = {
  userId: string;
  name: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function roleLabel(role: UserRole) {
  return mapDbRoleToClientRole(role);
}

function buildInviteUrl(rawToken: string) {
  const appUrl = process.env.APP_URL?.trim();

  if (!appUrl) {
    return null;
  }

  return `${appUrl.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(rawToken)}`;
}

async function expireStaleInvites(organizationId?: string) {
  await prisma.organizationInvite.updateMany({
    where: {
      status: "pending",
      expiresAt: {
        lt: new Date(),
      },
      ...(organizationId ? { organizationId } : {}),
    },
    data: {
      status: "expired",
    },
  });
}

async function countSecurityAdmins(organizationId: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  return client.membership.count({
    where: {
      organizationId,
      role: "security_admin",
      user: {
        status: {
          not: "suspended",
        },
      },
    },
  });
}

export async function listTeamMembers(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
    },
    include: {
      user: true,
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "asc" },
    ],
  });

  const adminCount = memberships.filter(
    (membership) => membership.role === "security_admin" && membership.user.status !== "suspended",
  ).length;

  return memberships.map((membership) => ({
    membershipId: membership.id,
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    roleLabel: roleLabel(membership.role),
    status: membership.user.status,
    department: membership.user.department ?? "Security",
    avatarInitials: membership.user.avatarInitials,
    joinedAt: membership.createdAt.toISOString(),
    lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
    isProtectedAdmin:
      membership.role === "security_admin" &&
      membership.user.status !== "suspended" &&
      adminCount <= 1,
  }));
}

export async function listTeamInvites(organizationId: string) {
  await expireStaleInvites(organizationId);

  const invites = await prisma.organizationInvite.findMany({
    where: {
      organizationId,
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    roleLabel: roleLabel(invite.role),
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    createdAt: invite.createdAt.toISOString(),
    invitedBy: invite.invitedBy
      ? {
          id: invite.invitedBy.id,
          name: invite.invitedBy.name,
          email: invite.invitedBy.email,
        }
      : null,
  }));
}

export async function createTeamInvite(input: {
  organizationId: string;
  actor: TeamActor;
  email: string;
  role: UserRole;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const organization = await prisma.organization.findUnique({
    where: {
      id: input.organizationId,
    },
  });

  if (!organization) {
    throw new Error("Organizasyon bulunamadı.");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      organizationId: input.organizationId,
      user: {
        email: normalizedEmail,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingMembership) {
    return {
      success: false as const,
      code: "MEMBER_ALREADY_EXISTS",
      message: "Bu e-posta adresi zaten çalışma alanı üyesi.",
    };
  }

  await expireStaleInvites(input.organizationId);

  await prisma.organizationInvite.updateMany({
    where: {
      organizationId: input.organizationId,
      email: normalizedEmail,
      status: "pending",
    },
    data: {
      status: "revoked",
    },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(rawToken);
  const inviteUrl = buildInviteUrl(rawToken);
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: input.organizationId,
      email: normalizedEmail,
      role: input.role,
      tokenHash,
      status: "pending",
      invitedByUserId: input.actor.userId,
      expiresAt: new Date(Date.now() + TEAM_INVITE_EXPIRES_MS),
    },
  });

  let delivery:
    | "sent"
    | "skipped"
    | "failed" = "skipped";

  if (inviteUrl) {
    const mailResult = await sendTeamInviteMail({
      to: normalizedEmail,
      inviteUrl,
      organizationName: organization.name,
      inviterName: input.actor.name,
      roleLabel: roleLabel(input.role),
    });

    delivery = mailResult.success ? "sent" : mailResult.reason === "delivery-failed" ? "failed" : "skipped";
  }

  await createAuthAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "team_invite_created",
    target: normalizedEmail,
    severity: "info",
    result: "success",
    details: `${roleLabel(input.role)} rolü için takım daveti oluşturuldu.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return {
    success: true as const,
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      roleLabel: roleLabel(invite.role),
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      invitedBy: {
        id: input.actor.userId,
        name: input.actor.name,
      },
    },
    delivery,
    inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : null,
  };
}

export async function revokeTeamInvite(input: {
  organizationId: string;
  actor: TeamActor;
  inviteId: string;
}) {
  await expireStaleInvites(input.organizationId);

  const invite = await prisma.organizationInvite.findFirst({
    where: {
      id: input.inviteId,
      organizationId: input.organizationId,
    },
  });

  if (!invite) {
    return {
      success: false as const,
      code: "INVITE_NOT_FOUND",
      message: "Davet kaydı bulunamadı.",
    };
  }

  if (invite.status !== "pending") {
    return {
      success: false as const,
      code: "INVITE_NOT_PENDING",
      message: "Sadece bekleyen davetler iptal edilebilir.",
    };
  }

  const revoked = await prisma.organizationInvite.update({
    where: {
      id: invite.id,
    },
    data: {
      status: "revoked",
    },
  });

  await createAuthAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "team_invite_revoked",
    target: revoked.email,
    severity: "warning",
    result: "success",
    details: "Bekleyen takım daveti iptal edildi.",
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return {
    success: true as const,
  };
}

export async function updateTeamMemberRole(input: {
  organizationId: string;
  actor: TeamActor;
  targetUserId: string;
  nextRole: UserRole;
}) {
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.targetUserId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return {
      success: false as const,
      code: "MEMBER_NOT_FOUND",
      message: "Üye kaydı bulunamadı.",
    };
  }

  if (membership.role === input.nextRole) {
    return {
      success: true as const,
      member: membership,
    };
  }

  const adminCount = await countSecurityAdmins(input.organizationId);

  if (
    membership.role === "security_admin" &&
    input.nextRole !== "security_admin" &&
    adminCount <= 1
  ) {
    return {
      success: false as const,
      code: "LAST_ADMIN_PROTECTED",
      message: "Son Security Admin rolü değiştirilemez.",
    };
  }

  const updated = await prisma.$transaction(async (transaction) => {
    const nextMembership = await transaction.membership.update({
      where: {
        id: membership.id,
      },
      data: {
        role: input.nextRole,
      },
      include: {
        user: true,
      },
    });

    await transaction.user.update({
      where: {
        id: membership.userId,
      },
      data: {
        role: input.nextRole,
      },
    });

    return nextMembership;
  });

  await createAuthAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "team_member_role_updated",
    target: membership.user.email,
    severity: "info",
    result: "success",
    details: `${membership.user.name} kullanıcısının rolü ${roleLabel(input.nextRole)} olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return {
    success: true as const,
    member: updated,
  };
}

export async function removeTeamMember(input: {
  organizationId: string;
  actor: TeamActor;
  targetUserId: string;
}) {
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.targetUserId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return {
      success: false as const,
      code: "MEMBER_NOT_FOUND",
      message: "Üye kaydı bulunamadı.",
    };
  }

  const adminCount = await countSecurityAdmins(input.organizationId);

  if (membership.role === "security_admin" && adminCount <= 1) {
    return {
      success: false as const,
      code: "LAST_ADMIN_PROTECTED",
      message: "Son Security Admin çalışma alanından çıkarılamaz.",
    };
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.membership.delete({
      where: {
        id: membership.id,
      },
    });

    await transaction.session.updateMany({
      where: {
        organizationId: input.organizationId,
        userId: input.targetUserId,
        status: {
          in: ["active", "pending_2fa"],
        },
      },
      data: {
        status: "revoked",
      },
    });

    const remainingMembershipCount = await transaction.membership.count({
      where: {
        userId: input.targetUserId,
      },
    });

    if (remainingMembershipCount === 0) {
      await transaction.user.update({
        where: {
          id: input.targetUserId,
        },
        data: {
          status: "suspended",
        },
      });
    }
  });

  await createAuthAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "team_member_removed",
    target: membership.user.email,
    severity: "warning",
    result: "success",
    details: `${membership.user.name} çalışma alanı üyeliğinden çıkarıldı.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return {
    success: true as const,
  };
}

export async function acceptTeamInvite(input: {
  token: string;
  actor: TeamActor;
  currentUserId: string;
  currentEmail: string;
}) {
  await expireStaleInvites();

  const invite = await prisma.organizationInvite.findUnique({
    where: {
      tokenHash: hashInviteToken(input.token),
    },
    include: {
      organization: true,
    },
  });

  if (!invite || invite.status !== "pending" || invite.expiresAt.getTime() <= Date.now()) {
    return {
      success: false as const,
      code: "INVITE_INVALID",
      message: "Davet bağlantısı geçersiz veya süresi dolmuş.",
    };
  }

  if (normalizeEmail(invite.email) !== normalizeEmail(input.currentEmail)) {
    return {
      success: false as const,
      code: "INVITE_EMAIL_MISMATCH",
      message: "Bu davet farklı bir hesap için oluşturulmuş.",
    };
  }

  await prisma.$transaction(async (transaction) => {
    const existingMembership = await transaction.membership.findFirst({
      where: {
        organizationId: invite.organizationId,
        userId: input.currentUserId,
      },
    });

    if (!existingMembership) {
      await transaction.membership.create({
        data: {
          userId: input.currentUserId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });
    }

    await transaction.organizationInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    });

    await transaction.user.update({
      where: {
        id: input.currentUserId,
      },
      data: {
        role: invite.role,
        status: "active",
      },
    });
  });

  await createAuthAuditLog({
    organizationId: invite.organizationId,
    userId: input.currentUserId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "team_invite_accepted",
    target: invite.organization.name,
    severity: "info",
    result: "success",
    details: `${invite.organization.name} çalışma alanı daveti kabul edildi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return {
    success: true as const,
    organization: mapOrganizationToProfile(invite.organization),
  };
}
