import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { assertDatabaseIsolation } from "../src/lib/database-isolation";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// Deliberately not an HTTP endpoint and never creates or resets a password.
const email = process.env.HCSC_PASSWORD_ONLY_ADMIN_EMAIL?.trim().toLowerCase();
const id = process.env.HCSC_PASSWORD_ONLY_ADMIN_USER_ID?.trim();
const apply = process.argv.includes("--apply");
const deploymentCheck = process.argv.includes("--deployment-check");

async function main() {
  if (deploymentCheck && apply) throw new Error("Deployment checks must be read-only.");
  if (deploymentCheck && process.env.HCSC_PASSWORD_ONLY_ADMIN_ENABLED !== "true") return;
  if (!email || !id || !process.env.DATABASE_URL) throw new Error("Admin email, immutable user ID and DATABASE_URL are required.");
  assertDatabaseIsolation(process.env);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, include: { memberships: true } });
      if (!user || user.email.toLowerCase() !== email) throw new Error("Exact admin identity not found; no changes made.");
      if (user.status !== "active") throw new Error("Inactive account; no changes made.");
      if (deploymentCheck && user.platformRole !== "ADMIN") throw new Error("Designated account is not an admin; deployment blocked.");
      const membership = user.memberships.find((entry) => entry.role === "security_admin");
      if (!membership) throw new Error("Existing workspace admin membership required; no tenant access added.");
      if (apply) {
        await tx.user.update({ where: { id }, data: { platformRole: "ADMIN" } });
        await tx.session.updateMany({ where: { userId: id, status: { in: ["active", "pending_2fa"] } }, data: { status: "revoked" } });
        await tx.auditLog.create({ data: {
          organizationId: membership.organizationId, userId: id, actorName: "HCSC setup operator", actorRole: "System",
          action: "password_only_admin_provisioned", module: "Admin", target: email,
          result: "success", severity: "high",
          details: "User-approved password-only admin prepared. Password and TOTP enrollment preserved; existing sessions revoked. Runtime exception requires explicit environment configuration.",
          metadata: { previousPlatformRole: user.platformRole, previousMfaEnabled: user.mfaEnabled, userId: id },
        } });
      }
      console.log(JSON.stringify({ mode: apply ? "applied" : "check", id, email, platformRole: apply ? "ADMIN" : user.platformRole, organizationId: membership.organizationId, passwordChanged: false, totpEnrollmentDeleted: false }));
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => { console.error("Admin provisioning failed. Check identity, membership and database access; secrets suppressed."); process.exitCode = 1; });
