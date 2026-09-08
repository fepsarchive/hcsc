import "dotenv/config";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { getSessionContext } from "../../src/server/auth/session";
import { getApplicationPolicy } from "../../src/server/auth/application-policy";
import { sendPasswordResetMail } from "../../src/server/mail/resend-mailer";
import { probeCache } from "../../src/server/health/dependency-health";

function fixture(options: { status?: string; membership?: boolean; role?: string; sessionStatus?: string } = {}) {
  const updates: unknown[] = [];
  const client = {
    session: {
      findUnique: async () => ({ id: "s", userId: "u", organizationId: "org", status: options.sessionStatus ?? "active", expiresAt: new Date(Date.now() + 60000), user: { id: "u", status: options.status ?? "active", role: "security_admin", platformRole: "USER" } }),
      update: async (input: unknown) => { updates.push(input); },
    },
    membership: { findFirst: async () => options.membership === false ? null : { role: options.role ?? "auditor" } },
  } as unknown as NonNullable<Parameters<typeof getSessionContext>[1]>;
  return { client, updates };
}

test("session resolves permissions from membership rather than global user role", async () => {
  const { client } = fixture();
  const session = await getSessionContext("opaque-token", client);
  assert.equal(session?.user.role, "auditor");
});

test("suspended account and removed membership revoke the session", async () => {
  for (const options of [{ status: "suspended" }, { membership: false }]) {
    const { client, updates } = fixture(options);
    assert.equal(await getSessionContext("opaque-token", client), null);
    assert.deepEqual(updates, [{ where: { id: "s" }, data: { status: "revoked" } }]);
  }
});

test("revoked sessions stay revoked and anonymous requests do not hit the database", async () => {
  const { client, updates } = fixture({ sessionStatus: "revoked" });
  assert.equal(await getSessionContext("token", client), null);
  assert.deepEqual(updates, []);
  assert.equal(await getSessionContext(null, client), null);
});

test("maintenance and registration switches honor persisted boolean settings", async () => {
  const client = { appSetting: { findMany: async () => [{ key: "maintenanceMode", value: true }, { key: "registrationEnabled", value: false }] } } as unknown as NonNullable<Parameters<typeof getApplicationPolicy>[0]>;
  assert.deepEqual(await getApplicationPolicy(client), { maintenanceMode: true, registrationEnabled: false });
});

test("mail provider rejection is not reported as successful delivery", async () => {
  const previous = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM, url: process.env.APP_URL };
  process.env.RESEND_API_KEY = "re_test_not_a_real_key";
  process.env.MAIL_FROM = "test@example.com";
  process.env.APP_URL = "https://example.com";
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ name: "validation_error", message: "test rejection" }), { status: 400, headers: { "Content-Type": "application/json" } }));
  try {
    const result = await sendPasswordResetMail({ to: "test@example.com", resetUrl: "https://example.com/reset" });
    assert.deepEqual(result, { success: false, reason: "delivery-failed" });
    assert.equal(fetchMock.mock.callCount(), 1);
  } finally {
    fetchMock.mock.restore();
    for (const [key, value] of Object.entries({ RESEND_API_KEY: previous.key, MAIL_FROM: previous.from, APP_URL: previous.url })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("cache HTTP 200 with an error payload is degraded, PONG is healthy", async () => {
  const previous = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  process.env.UPSTASH_REDIS_REST_URL = "https://cache.example.com";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
  let pong = false;
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(pong ? [{ result: "PONG" }] : [{ error: "invalid token" }]), { status: 200 }));
  try {
    assert.equal((await probeCache()).status, "degraded");
    pong = true;
    assert.equal((await probeCache()).status, "healthy");
  } finally {
    fetchMock.mock.restore();
    for (const [key, value] of Object.entries({ UPSTASH_REDIS_REST_URL: previous.url, UPSTASH_REDIS_REST_TOKEN: previous.token })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
