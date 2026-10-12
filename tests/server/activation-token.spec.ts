import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

test("activation/reset token is consumed once and never grants MFA or a session", async () => {
  const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
  const previousClient = globalDb.prisma;
  let used = false;
  let expired = false;
  let suspended = false;
  let passwordWrites = 0;
  let sessionRevocations = 0;
  const user = { id: "new-user", status: "active", memberships: [] };
  const tx = {
    passwordResetToken: {
      updateMany: async () => {
        if (used || expired || suspended) return { count: 0 };
        used = true;
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    user: { update: async ({ data }: { data: Record<string, unknown> }) => {
      assert.deepEqual(Object.keys(data), ["passwordHash"]);
      assert.match(String(data.passwordHash), /^scrypt\$/);
      passwordWrites++;
    } },
    session: { updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      assert.equal(data.status, "revoked");
      sessionRevocations++;
    } },
  };
  globalDb.prisma = {
    passwordResetToken: { findUnique: async () => ({
      id: "reset", userId: user.id, usedAt: null,
      expiresAt: new Date(Date.now() + (expired ? -1000 : 60000)), user: { ...user, status: suspended ? "suspended" : "active" },
    }) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaClient;
  try {
    const { resetPasswordWithToken } = await import("../../src/server/auth/account");
    const input = { token: "isolated-fixture-token-not-real", password: "isolated-fixture-password" };
    const results = await Promise.all([resetPasswordWithToken(input), resetPasswordWithToken(input)]);
    assert.equal(results.filter((result) => result.success).length, 1);
    assert.equal(passwordWrites, 1);
    assert.equal(sessionRevocations, 1);
    assert.equal((await resetPasswordWithToken(input)).success, false);
    used = false;
    expired = true;
    assert.equal((await resetPasswordWithToken(input)).success, false);
    expired = false;
    suspended = true;
    assert.equal((await resetPasswordWithToken(input)).success, false);
    assert.equal(passwordWrites, 1);
  } finally {
    globalDb.prisma = previousClient;
  }
});
