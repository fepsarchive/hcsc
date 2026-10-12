import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

test("closed registration and managed provisioning boundaries (no real database/mail)", async () => {
  const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
  const previousClient = globalDb.prisma;
  globalDb.prisma = {} as PrismaClient;
  try {
    const { POST: register } = await import("../../src/app/api/auth/register/route");
    const response = await register();
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "REGISTRATION_DISABLED");
    assert.equal(response.headers.has("set-cookie"), false);

    const { getApplicationPolicy } = await import("../../src/server/auth/application-policy");
    assert.equal((await getApplicationPolicy({ appSetting: { findMany: async () => [{ key: "registrationEnabled", value: true }] } } as never)).registrationEnabled, false);

    const { POST: provisionRoute } = await import("../../src/app/api/admin/users/route");
    // Must reject before trying to parse the body or write anything.
    assert.equal((await provisionRoute(new NextRequest("https://app.example.test/api/admin/users", { method: "POST", body: "invalid" }))).status, 401);

    const previousOwner = process.env.SYSTEM_OWNER_USER_ID;
    process.env.SYSTEM_OWNER_USER_ID = "fixture-owner";
    const sessionFixture = {
      id: "session", organizationId: "owner-org", userId: "fixture-owner", status: "pending_2fa", is2FAVerified: false,
      expiresAt: new Date(Date.now() + 60000),
      user: { id: "fixture-owner", email: "owner@example.test", name: "Owner", role: "security_admin", platformRole: "ADMIN", status: "active" },
    };
    Object.assign(globalDb.prisma!, {
      session: { findUnique: async () => sessionFixture, update: async () => sessionFixture },
      membership: { findFirst: async () => ({ role: "security_admin" }) },
      auditLog: { create: async () => ({}) },
      securityEvent: { create: async () => { throw new Error("isolated event fixture"); } },
    });
    const guardedRequest = (origin = "https://app.example.test", body = {}) => new NextRequest("https://app.example.test/api/admin/users", {
      method: "POST", headers: { cookie: "hcsc_session=isolated-fixture", origin }, body: JSON.stringify(body),
    });
    try {
      assert.equal((await provisionRoute(guardedRequest())).status, 403);
      sessionFixture.status = "active";
      sessionFixture.is2FAVerified = true;
      sessionFixture.user.id = "ordinary-user";
      assert.equal((await provisionRoute(guardedRequest())).status, 403);
      sessionFixture.user.id = "fixture-owner";
      assert.equal((await provisionRoute(guardedRequest("https://untrusted.example.test"))).status, 403);
      assert.equal((await provisionRoute(guardedRequest())).status, 400);
    } finally {
      if (previousOwner === undefined) delete process.env.SYSTEM_OWNER_USER_ID; else process.env.SYSTEM_OWNER_USER_ID = previousOwner;
    }

    const { provisionManagedUser, provisionUserSchema } = await import("../../src/server/admin/provision-user");
    const account = { fullName: "Fixture User", email: " NEW@EXAMPLE.TEST ", companyName: "Fixture Org" };
    assert.equal(provisionUserSchema.parse(account).email, "new@example.test");
    for (const extra of [{ platformRole: "ADMIN" }, { password: "caller-controlled" }, { organizationId: "other-tenant" }]) {
      assert.equal(provisionUserSchema.safeParse({ ...account, ...extra }).success, false);
    }
    const session = { organizationId: "owner-org", userId: "owner", user: { name: "Owner", role: "security_admin" } } as never;
    let mailCalls = 0;
    let emailToken = "";
    let tokenHash = "";
    let duplicate = false;
    let auditFailure = false;
    let committed = 0;
    let staged = 0;
    const tx = {
      user: {
        findFirst: async () => duplicate ? { id: "existing" } : null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          assert.equal(data.platformRole, "USER");
          assert.equal(data.mfaEnabled, false);
          assert.equal(data.role, "security_admin");
          assert.equal(data.sessions, undefined);
          assert.equal(data.twoFactorSecret, undefined);
          assert.match(String(data.passwordHash), /^scrypt\$/);
          const reset = data.passwordResetTokens as { create: { tokenHash: string; expiresAt: Date } };
          tokenHash = reset.create.tokenHash;
          assert.ok(reset.create.expiresAt.getTime() - Date.now() <= 3600000);
          staged++;
          return { id: "new-user", name: data.name, email: data.email };
        },
      },
      organization: { create: async ({ data }: { data: Record<string, unknown> }) => {
        assert.equal(data.demoMode, false);
        assert.equal(data.onboardingCompleted, false);
        assert.equal(data.assets, undefined);
        staged++;
        return { id: "new-org" };
      } },
      auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => {
        if (auditFailure) throw new Error("audit write failed");
        assert.equal(data.userId, "owner");
        assert.equal(data.action, "admin_user_provisioned");
        assert.equal(data.target, "new-user");
        assert.equal(JSON.stringify(data).includes(tokenHash), false);
        staged++;
      } },
    };
    const client = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
      staged = 0;
      const result = await callback(tx);
      committed += staged;
      return result;
    } } as unknown as PrismaClient;
    const sendMail = async (mail: { resetUrl: string }) => {
      mailCalls++;
      emailToken = new URL(mail.resetUrl).searchParams.get("token")!;
      assert.equal(new URL(mail.resetUrl).origin, "https://app.example.test");
      return { success: true };
    };
    const deps = { client, sendMail, appUrl: "https://app.example.test" };
    const result = await provisionManagedUser({ account, session }, deps);
    assert.equal(result.activationDelivery, "accepted_by_provider");
    assert.equal(committed, 3);
    assert.equal(mailCalls, 1);
    assert.notEqual(tokenHash, emailToken);
    assert.equal(JSON.stringify(result).includes(emailToken), false);
    assert.equal(JSON.stringify(result).includes("scrypt$"), false);
    duplicate = true;
    await assert.rejects(provisionManagedUser({ account, session }, deps), { code: "EMAIL_TAKEN" });
    assert.equal(committed, 3);
    assert.equal(mailCalls, 1);
    duplicate = false;
    auditFailure = true;
    await assert.rejects(provisionManagedUser({ account, session }, deps), /audit write failed/);
    assert.equal(committed, 3);
    assert.equal(mailCalls, 1);
    auditFailure = false;
    const failedMail = await provisionManagedUser({ account, session }, { ...deps, sendMail: async () => { throw new Error("delivery error"); } });
    assert.equal(failedMail.activationDelivery, "failed");
    assert.equal(failedMail.userId, "new-user");
    assert.equal(committed, 6);
    for (const appUrl of [undefined, "javascript:alert(1)", "https://user:pass@app.example.test", "https://app.example.test?host=evil"]) {
      await assert.rejects(provisionManagedUser({ account, session }, { ...deps, appUrl }), { code: "ACTIVATION_URL_MISSING" });
    }
    assert.equal(committed, 6);
  } finally {
    globalDb.prisma = previousClient;
  }
});
