import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { assertDatabaseIsolation } from "../src/lib/database-isolation";

// Explicit operator-only maintenance command. Never called by normal builds or HTTP.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const { values } = parseArgs({ options: {
  id: { type: "string", short: "i" }, email: { type: "string", short: "e" }, "request-id": { type: "string", short: "r" },
  "expected-database": { type: "string", short: "d" }, apply: { type: "boolean", default: false },
} });

async function main() {
  const { id, email, apply } = values;
  const requestId = values["request-id"];
  if (!id || !email || !requestId || !process.env.DATABASE_URL) throw new Error("Missing arguments");
  const url = new URL(process.env.DATABASE_URL);
  const databaseFingerprint = createHash("sha256")
    .update(`${url.hostname.replace("-pooler.", ".")}${url.pathname}`)
    .digest("hex");
  if (apply && values["expected-database"] !== databaseFingerprint) {
    console.log(JSON.stringify({ mode: "blocked", reason: "database_target_mismatch", databaseFingerprint }));
    throw new Error("Target mismatch");
  }
  assertDatabaseIsolation(process.env);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const inspectOrReset = async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({ where: { id }, select: {
        id: true, email: true, status: true, platformRole: true, mfaEnabled: true,
        memberships: { select: { role: true, organizationId: true } },
      } });
      if (!user || user.email.toLowerCase() !== email.toLowerCase() || user.status !== "active" || user.platformRole !== "ADMIN") {
        throw new Error("Exact active admin identity required");
      }
      const membership = user.memberships.find((entry) => entry.role === "security_admin");
      if (!membership) throw new Error("Existing admin membership required");
      const completed = await tx.auditLog.findUnique({ where: { id: requestId }, select: { userId: true, action: true } });
      if (completed && (completed.userId !== id || completed.action !== "two_factor_operator_reset")) throw new Error("Request ID collision");
      const before = {
        totpRecords: await tx.twoFactorSecret.count({ where: { userId: id } }),
        recoveryCodes: await tx.recoveryCode.count({ where: { userId: id } }),
        sessions: await tx.session.count({ where: { userId: id, status: { in: ["active", "pending_2fa"] } } }),
      };
      if (apply && !completed) {
        await tx.twoFactorSecret.deleteMany({ where: { userId: id } });
        await tx.recoveryCode.deleteMany({ where: { userId: id } });
        await tx.session.updateMany({ where: { userId: id, status: { in: ["active", "pending_2fa"] } }, data: { status: "revoked" } });
        await tx.user.update({ where: { id }, data: { mfaEnabled: false } });
        await tx.auditLog.create({ data: {
          id: requestId, userId: id, organizationId: membership.organizationId,
          actorName: "HCSC authorized recovery operator", actorRole: "System",
          action: "two_factor_operator_reset", module: "Auth", target: email,
          severity: "high", result: "success",
          details: "User-approved lost-authenticator recovery. Previous TOTP and recovery codes removed; existing sessions revoked. User, password, roles, memberships and history preserved. Fresh password login and MFA enrollment required.",
          metadata: { requestId, before, databaseFingerprint },
        } });
      }
      return { mode: completed ? "already_applied" : apply ? "applied" : "check", id, email,
        databaseFingerprint, before, passwordChanged: false, rolesChanged: false,
        resetRecorded: Boolean(completed) || apply,
        totpRecordsAfter: await tx.twoFactorSecret.count({ where: { userId: id } }),
        recoveryCodesAfter: await tx.recoveryCode.count({ where: { userId: id } }),
        liveSessionsAfter: await tx.session.count({ where: { userId: id, status: { in: ["active", "pending_2fa"] } } }),
      };
    };
    // A read-only report does not need to hold an interactive transaction while
    // a remote/scale-to-zero database wakes. Apply always rechecks atomically.
    const result = apply
      ? await client.$transaction(inspectOrReset, { isolationLevel: "Serializable", maxWait: 15000, timeout: 30000 })
      : await inspectOrReset(client);
    console.log(JSON.stringify(result));
  } finally { await client.$disconnect(); }
}

main().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
  console.error("MFA recovery failed; credentials and raw error suppressed.", { code: /^[A-Z0-9_]{2,32}$/.test(code) ? code : "unknown" });
  process.exitCode = 1;
});
