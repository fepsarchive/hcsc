import assert from "node:assert/strict";
import test, { before } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { isConfiguredAdmin, isPasswordOnlyAdmin, hasCompletedAuthentication } from "../../src/server/auth/password-only-admin";
import { isSystemOwnerSession } from "../../src/server/admin/admin-access-policy";
let getSessionContext: typeof import("../../src/server/auth/session").getSessionContext;
before(async () => {
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma = {} as PrismaClient;
  ({ getSessionContext } = await import("../../src/server/auth/session"));
});

const identity = { id: "designated-admin", email: "admin@example.test", status: "active", platformRole: "ADMIN" };
const config = { HCSC_PASSWORD_ONLY_ADMIN_ENABLED: "true", HCSC_PASSWORD_ONLY_ADMIN_USER_ID: identity.id, HCSC_PASSWORD_ONLY_ADMIN_EMAIL: identity.email };

test("password-only admin requires explicit enablement, immutable ID, email, active status and admin role", () => {
  const before = { ...process.env };
  Object.assign(process.env, config);
  try {
    assert.equal(isPasswordOnlyAdmin(identity), true);
    for (const change of [{ id: "replacement-user" }, { email: "other@example.test" }, { status: "suspended" }, { platformRole: "USER" }]) {
      assert.equal(isPasswordOnlyAdmin({ ...identity, ...change }), false);
    }
    for (const key of Object.keys(config)) {
      const original = process.env[key];
      delete process.env[key];
      assert.equal(isPasswordOnlyAdmin(identity), false);
      process.env[key] = original;
    }
    process.env.HCSC_PASSWORD_ONLY_ADMIN_ENABLED = "false";
    assert.equal(isPasswordOnlyAdmin(identity), false);
    assert.equal(isConfiguredAdmin(identity), true);
    const verified = { is2FAVerified: true, twoFactorExempt: false, user: identity } as Parameters<typeof isSystemOwnerSession>[0];
    assert.equal(isSystemOwnerSession(verified), true);
    assert.equal(isSystemOwnerSession({ ...verified!, is2FAVerified: false }), false);
    assert.equal(isSystemOwnerSession({ ...verified!, user: { ...verified!.user, id: "unconfigured-admin" } }), false);
    assert.equal(hasCompletedAuthentication({ is2FAVerified: false }), false);
  } finally {
    for (const key of Object.keys(config)) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
  }
});

test("password-only session stays honest about MFA, grants admin access, and is revoked when exception is removed", async () => {
  const before = { ...process.env };
  Object.assign(process.env, config);
  let revoked = false;
  const client = {
    session: {
      findUnique: async () => ({ id: "session", userId: identity.id, organizationId: "org", status: "active", is2FAVerified: false, expiresAt: new Date(Date.now() + 60000), user: identity }),
      update: async ({ data }: { data: { status?: string } }) => { if (data.status === "revoked") revoked = true; },
    },
    membership: { findFirst: async () => ({ role: "security_admin" }) },
  } as unknown as NonNullable<Parameters<typeof getSessionContext>[1]>;
  try {
    const session = await getSessionContext("opaque-token", client);
    assert.ok(session);
    assert.equal(session.is2FAVerified, false);
    assert.equal(session.twoFactorExempt, true);
    assert.equal(hasCompletedAuthentication(session) && isPasswordOnlyAdmin(session.user), true);
    process.env.HCSC_PASSWORD_ONLY_ADMIN_ENABLED = "false";
    assert.equal(await getSessionContext("opaque-token", client), null);
    assert.equal(revoked, true);
  } finally {
    for (const key of Object.keys(config)) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
  }
});

test("pending sessions do not inherit the exception before a fresh password login", async () => {
  const before = { ...process.env };
  Object.assign(process.env, config);
  const client = {
    session: {
      findUnique: async () => ({ id: "s", userId: identity.id, organizationId: "org", status: "pending_2fa", is2FAVerified: false, expiresAt: new Date(Date.now() + 60000), user: identity }),
      update: async () => undefined,
    },
    membership: { findFirst: async () => ({ role: "security_admin" }) },
  } as unknown as NonNullable<Parameters<typeof getSessionContext>[1]>;
  try {
    const session = await getSessionContext("opaque-token", client);
    assert.ok(session);
    assert.equal(session.twoFactorExempt, false);
    assert.equal(hasCompletedAuthentication(session), false);
  } finally {
    for (const key of Object.keys(config)) {
      if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key];
    }
  }
});

test("expired sessions are rejected before granting any admin exception", async () => {
  let expired = false;
  const client = {
    session: {
      findUnique: async () => ({ id: "expired-admin", status: "active", is2FAVerified: false, expiresAt: new Date(Date.now() - 1) }),
      update: async ({ data }: { data: { status?: string } }) => { expired = data.status === "expired"; },
    },
    membership: { findFirst: async () => { throw new Error("Expired sessions must not resolve permissions"); } },
  } as unknown as NonNullable<Parameters<typeof getSessionContext>[1]>;
  assert.equal(await getSessionContext("expired-token", client), null);
  assert.equal(expired, true);
});
