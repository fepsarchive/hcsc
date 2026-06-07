import "dotenv/config";

import { createHash, scryptSync, timingSafeEqual } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  CloudMode,
  PlatformRole,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";

import { hashPassword } from "../src/server/auth/password";

const FALLBACK_OWNER_EMAIL = "security.admin@hcsc.local";
const FALLBACK_ORGANIZATION_ID = "org_hcsc_system_owner_workspace";
const FALLBACK_ORGANIZATION_SLUG = "hcsc-system-owner-workspace";
const DEFAULT_OWNER_USER_ID = "user_security_admin";
const DEFAULT_PASSWORD = "demo123";

type Mode = "check" | "fix" | "reset-password";

type FindingStatus = "ok" | "missing" | "needs_fix" | "warning";

type Finding = {
  key: string;
  status: FindingStatus;
  detail: string;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseMode(): Mode {
  const raw = process.argv[2] ?? "check";

  if (raw === "check" || raw === "fix" || raw === "reset-password") {
    return raw;
  }

  throw new Error("Usage: tsx scripts/ensure-system-owner.ts [check|fix|reset-password]");
}

function requireDatabaseUrl() {
  const databaseUrl = clean(process.env.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required, but its value will not be printed.");
  }

  return databaseUrl;
}

function getOwnerPassword() {
  return clean(process.env.ADMIN_SEED_PASSWORD) ?? DEFAULT_PASSWORD;
}

function getOwnerTarget() {
  return {
    ownerUserId: clean(process.env.SYSTEM_OWNER_USER_ID),
    ownerEmail: (clean(process.env.SYSTEM_OWNER_EMAIL) ?? FALLBACK_OWNER_EMAIL).toLowerCase(),
    envConfigured: Boolean(clean(process.env.SYSTEM_OWNER_USER_ID) || clean(process.env.SYSTEM_OWNER_EMAIL)),
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyProductionPassword(password: string, passwordHash: string) {
  if (!passwordHash) {
    return false;
  }

  if (passwordHash.startsWith("sha256$")) {
    return safeEqual(createHash("sha256").update(password).digest("hex"), passwordHash.slice("sha256$".length));
  }

  if (passwordHash.startsWith("scrypt$")) {
    const [, salt, expectedHash] = passwordHash.split("$");

    if (!salt || !expectedHash) {
      return false;
    }

    return safeEqual(scryptSync(password, salt, 64).toString("hex"), expectedHash);
  }

  return false;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireDatabaseUrl() }),
  });
}

function formatFindings(findings: Finding[]) {
  for (const finding of findings) {
    console.log(`${finding.status.toUpperCase()} ${finding.key}: ${finding.detail}`);
  }
}

async function findOwner(prisma: PrismaClient) {
  const target = getOwnerTarget();

  if (target.ownerUserId) {
    const byId = await prisma.user.findUnique({
      where: { id: target.ownerUserId },
      include: { memberships: true, twoFactorSecret: true },
    });

    if (byId) {
      return byId;
    }
  }

  return prisma.user.findUnique({
    where: { email: target.ownerEmail },
    include: { memberships: true, twoFactorSecret: true },
  });
}

function hasProductionCompatibleTwoFactorSecret(secret: string | null | undefined) {
  if (!secret) {
    return false;
  }

  if (secret.startsWith("totp:v1:")) {
    return true;
  }

  return /^[A-Z2-7]{16,}$/.test(secret.replace(/\s+/g, "").toUpperCase());
}

function isOwnerTwoFactorProductionReady(owner: NonNullable<Awaited<ReturnType<typeof findOwner>>>) {
  const secret = owner.twoFactorSecret;

  return Boolean(
    secret &&
      (secret.enabledAt || secret.enrolledAt) &&
      hasProductionCompatibleTwoFactorSecret(secret.secret),
  );
}

async function getFindings(prisma: PrismaClient): Promise<Finding[]> {
  const target = getOwnerTarget();
  const owner = await findOwner(prisma);
  const ownerPassword = getOwnerPassword();
  const findings: Finding[] = [
    {
      key: "DATABASE_URL",
      status: "ok",
      detail: "configured",
    },
    {
      key: "SYSTEM_OWNER_ENV",
      status: target.envConfigured ? "ok" : "warning",
      detail: target.envConfigured
        ? "SYSTEM_OWNER_EMAIL or SYSTEM_OWNER_USER_ID configured"
        : "env missing; app will use fallback security.admin@hcsc.local",
    },
  ];

  if (!owner) {
    findings.push({
      key: "OWNER_USER",
      status: "missing",
      detail: "system owner account not found",
    });
    return findings;
  }

  findings.push(
    {
      key: "OWNER_EMAIL",
      status: owner.email.toLowerCase() === target.ownerEmail ? "ok" : "warning",
      detail:
        owner.email.toLowerCase() === target.ownerEmail
          ? "matches configured owner email"
          : "SYSTEM_OWNER_USER_ID resolves to a user with a different email",
    },
    {
      key: "OWNER_PASSWORD",
      status: verifyProductionPassword(ownerPassword, owner.passwordHash) ? "ok" : "needs_fix",
      detail: "checked with production-compatible verifier without printing password hash",
    },
    {
      key: "OWNER_PLATFORM_ROLE",
      status: owner.platformRole === PlatformRole.ADMIN ? "ok" : "needs_fix",
      detail: `current=${owner.platformRole}`,
    },
    {
      key: "OWNER_PRODUCT_ROLE",
      status: owner.role === UserRole.security_admin ? "ok" : "needs_fix",
      detail: `current=${owner.role}`,
    },
    {
      key: "OWNER_STATUS",
      status: owner.status === UserStatus.active ? "ok" : "needs_fix",
      detail: `current=${owner.status}`,
    },
    {
      key: "OWNER_MEMBERSHIP",
      status: owner.memberships.length >= 1 ? "ok" : "needs_fix",
      detail: `count=${owner.memberships.length}`,
    },
    {
      key: "OWNER_2FA",
      status: isOwnerTwoFactorProductionReady(owner) ? "ok" : "needs_fix",
      detail: isOwnerTwoFactorProductionReady(owner)
        ? "production-compatible TOTP enrollment present"
        : "missing or legacy demo 2FA enrollment; production will not accept demo code",
    },
  );

  return findings;
}

async function ensureOrganization(prisma: PrismaClient) {
  const existingMembership = await prisma.membership.findFirst({
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (existingMembership?.organization) {
    return existingMembership.organization;
  }

  return prisma.organization.upsert({
    where: { slug: FALLBACK_ORGANIZATION_SLUG },
    update: {
      name: "HCSC System Owner Workspace",
      plan: "Enterprise Security Workspace",
      region: "Production",
      cloudMode: CloudMode.hybrid_cloud,
      complianceFrameworks: ["ISO 27001", "NIST CSF 2.0"],
      onboardingCompleted: true,
    },
    create: {
      id: FALLBACK_ORGANIZATION_ID,
      name: "HCSC System Owner Workspace",
      slug: FALLBACK_ORGANIZATION_SLUG,
      plan: "Enterprise Security Workspace",
      region: "Production",
      cloudMode: CloudMode.hybrid_cloud,
      complianceFrameworks: ["ISO 27001", "NIST CSF 2.0"],
      demoMode: false,
      onboardingCompleted: true,
    },
  });
}

async function writeOwnerScriptAuditLog(
  prisma: PrismaClient,
  input: {
    organizationId: string | null;
    userId: string;
    ownerEmail: string;
    action: "system_owner_ensured" | "system_owner_password_reset";
    details: string;
  },
) {
  if (!input.organizationId) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      actorName: "owner recovery script",
      actorRole: "System",
      action: input.action,
      module: "Admin",
      target: input.ownerEmail,
      result: "success",
      severity: "warning",
      details: input.details,
      metadata: {
        source: "scripts/ensure-system-owner.ts",
      },
    },
  });
}

async function fixOwner(prisma: PrismaClient, resetPassword: boolean) {
  const target = getOwnerTarget();
  const ownerPassword = getOwnerPassword();
  const existing = await findOwner(prisma);
  const organization = await ensureOrganization(prisma);
  const shouldResetPassword =
    resetPassword || !existing || !verifyProductionPassword(ownerPassword, existing.passwordHash);

  const owner = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name || "HCSC System Owner",
          role: UserRole.security_admin,
          platformRole: PlatformRole.ADMIN,
          status: UserStatus.active,
          mfaEnabled: true,
          ...(shouldResetPassword ? { passwordHash: hashPassword(ownerPassword) } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          id: target.ownerUserId ?? DEFAULT_OWNER_USER_ID,
          name: "HCSC System Owner",
          email: target.ownerEmail,
          passwordHash: hashPassword(ownerPassword),
          role: UserRole.security_admin,
          platformRole: PlatformRole.ADMIN,
          department: "Security Operations",
          avatarInitials: "HC",
          status: UserStatus.active,
          mfaEnabled: true,
        },
      });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: owner.id,
        organizationId: organization.id,
      },
    },
    update: {
      role: UserRole.security_admin,
    },
    create: {
      userId: owner.id,
      organizationId: organization.id,
      role: UserRole.security_admin,
    },
  });

  await writeOwnerScriptAuditLog(prisma, {
    organizationId: organization.id,
    userId: owner.id,
    ownerEmail: owner.email,
    action: resetPassword ? "system_owner_password_reset" : "system_owner_ensured",
    details: resetPassword
      ? "System owner password was reset by the owner recovery script."
      : "System owner account, role, status, and membership were ensured by the owner recovery script.",
  });
}

async function resetOwnerPasswordOnly(prisma: PrismaClient) {
  const owner = await findOwner(prisma);

  if (!owner) {
    throw new Error("System owner account not found. Run owner:fix only after reviewing production DB impact.");
  }

  await prisma.user.update({
    where: { id: owner.id },
    data: {
      passwordHash: hashPassword(getOwnerPassword()),
    },
  });

  await writeOwnerScriptAuditLog(prisma, {
    organizationId: owner.memberships[0]?.organizationId ?? null,
    userId: owner.id,
    ownerEmail: owner.email,
    action: "system_owner_password_reset",
    details: "System owner password was reset by the owner recovery script.",
  });
}

async function main() {
  const mode = parseMode();
  const prisma = createPrismaClient();

  try {
    if (mode === "check") {
      formatFindings(await getFindings(prisma));
      return;
    }

    if (mode === "reset-password") {
      await resetOwnerPasswordOnly(prisma);
    } else {
      await fixOwner(prisma, false);
    }

    formatFindings(await getFindings(prisma));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Owner recovery failed.");
  process.exit(1);
});
