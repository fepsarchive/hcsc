import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { hashPassword } from "../../src/server/auth/password";

test("password login → cookie → me → protected API preserves MFA truth and rejects wrong password", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, {
    HCSC_PASSWORD_ONLY_ADMIN_ENABLED: "true", HCSC_PASSWORD_ONLY_ADMIN_USER_ID: "login-admin",
    HCSC_PASSWORD_ONLY_ADMIN_EMAIL: "login-admin@example.test", NODE_ENV: "test",
    UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "",
    HCSC_TEST_AUTH_BYPASS_ENABLED: "false",
  });
  const organization = { id: "org", name: "Test", onboardingCompleted: true, cloudMode: "hybrid_cloud", complianceFrameworks: [], demoMode: false };
  const membership = { role: "security_admin", organizationId: "org", organization };
  const user = { id: "login-admin", email: "login-admin@example.test", name: "Admin", role: "security_admin", platformRole: "ADMIN", status: "active", avatarInitials: "AD", passwordHash: hashPassword("isolated-fixture-password"), memberships: [membership], mfaEnabled: true, twoFactorSecret: null };
  let storedSession: Record<string, unknown> | null = null;
  const auditActions: string[] = [];
  const client = {
    user: { findUnique: async () => user, update: async () => user },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { auditActions.push(data.action); return data; } },
    // Notification/integration delivery is outside this isolated authentication test.
    securityEvent: { create: async () => { throw new Error("isolated notification fixture"); } },
    session: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        storedSession = { ...data, id: "session", createdAt: new Date(), user, organization };
        return storedSession;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) => storedSession?.tokenHash === where.tokenHash ? storedSession : null,
      update: async ({ data }: { data: Record<string, unknown> }) => { Object.assign(storedSession ?? {}, data); return storedSession; },
    },
    membership: { findFirst: async () => membership },
    appSetting: { findMany: async () => [] },
  };
  const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
  const previousClient = globalDb.prisma;
  globalDb.prisma = client as unknown as PrismaClient;
  try {
    const { POST } = await import("../../src/app/api/auth/login/route");
    const { GET } = await import("../../src/app/api/auth/me/route");
    const { requireApiAuth } = await import("../../src/server/api/require-auth");
    const request = (password: string) => new NextRequest("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email: user.email, password }) });
    assert.equal((await POST(request("wrong-password"))).status, 401);
    assert.equal(storedSession, null);
    const response = await POST(request("isolated-fixture-password"));
    const payload = (await response.json()).data;
    assert.equal(response.status, 200);
    assert.equal(payload.requiresTwoFactor, false);
    assert.equal(payload.twoFactorVerified, false);
    assert.equal(payload.twoFactorExempt, true);
    assert.equal(payload.redirectTo, "/admin");
    assert.equal(payload.user.canAccessAdmin, true);
    assert.ok(auditActions.includes("password_only_admin_login"));
    const cookieMaxAge = Number(response.headers.get("set-cookie")!.match(/Max-Age=(\d+)/i)?.[1]);
    assert.ok(cookieMaxAge > 3500 && cookieMaxAge <= 3600);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const meRequest = new NextRequest("http://localhost/api/auth/me", { headers: { cookie } });
    const me = (await (await GET(meRequest)).json()).data;
    assert.equal(me.authenticated, true);
    assert.equal(me.twoFactorVerified, false);
    assert.equal(me.twoFactorExempt, true);
    assert.equal((await requireApiAuth(meRequest, { permission: "manage_settings" })).ok, true);
    assert.equal((await requireApiAuth(meRequest, { allowTwoFactorExemption: false })).ok, false);
    process.env.HCSC_PASSWORD_ONLY_ADMIN_ENABLED = "false";
    assert.equal((await (await GET(meRequest)).json()).data.authenticated, false);
    // With the exception disabled, the very same correct password requires 2FA.
    const ordinary = (await (await POST(request("isolated-fixture-password"))).json()).data;
    assert.equal(ordinary.requiresTwoFactor, true);
    assert.equal(ordinary.twoFactorExempt, false);
    assert.equal(ordinary.redirectTo, "/verify-2fa");
    assert.equal(ordinary.user.canAccessAdmin, true);
    assert.equal(ordinary.twoFactorEnrolled, false);
    assert.equal((await requireApiAuth(meRequest, { permission: "manage_settings" })).ok, false);
    assert.ok((storedSession!.expiresAt as Date).getTime() - Date.now() <= 3600000);
  } finally {
    globalDb.prisma = previousClient;
    for (const key of ["HCSC_PASSWORD_ONLY_ADMIN_ENABLED", "HCSC_PASSWORD_ONLY_ADMIN_USER_ID", "HCSC_PASSWORD_ONLY_ADMIN_EMAIL", "HCSC_TEST_AUTH_BYPASS_ENABLED", "NODE_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});
