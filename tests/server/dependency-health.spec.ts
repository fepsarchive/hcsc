import assert from "node:assert/strict";
import test from "node:test";
import { databaseTargetFingerprint } from "../../src/lib/database-isolation";
import { probeDatabase } from "../../src/server/health/dependency-health";
import { GET as readiness } from "../../src/app/api/health/ready/route";
import { GET as liveness } from "../../src/app/api/health/live/route";

test("health routes remain available and do not query unapproved database targets", async (t) => {
  const keys = ["DATABASE_URL", "DIRECT_URL", "VERCEL_ENV", "HCSC_DEPLOYMENT_ENV", "NODE_ENV", "HCSC_DATABASE_TARGET_FINGERPRINT", "HCSC_PRODUCTION_DATABASE_FINGERPRINT", "HCSC_PASSWORD_ONLY_ADMIN_ENABLED"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const globalDb = globalThis as typeof globalThis & { prisma?: unknown };
  const previousClient = globalDb.prisma;
  let queries: string[] = [];
  let failQuery = false;
  globalDb.prisma = {
    $queryRaw: async (parts: TemplateStringsArray) => {
      queries.push(parts.join(""));
      if (failQuery) throw new Error("sensitive-host-or-credential");
      return [];
    },
  };
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: "test", HCSC_DEPLOYMENT_ENV: "test" });
  try {
    await t.test("missing database gives JSON 503 while liveness stays 200", async () => {
      const response = await readiness();
      assert.equal(response.status, 503);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      const body = await response.json();
      assert.equal(body.status, "not_ready");
      assert.equal(body.checks.database.status, "not_configured");
      assert.equal(liveness().status, 200);
      assert.equal(queries.length, 0);
    });
    await t.test("unapproved remote target never reaches Prisma", async () => {
      process.env.DATABASE_URL = "postgresql://user:secret@db.example.com/hcsc";
      const response = await readiness();
      assert.equal(response.status, 503);
      const body = await response.text();
      assert.match(body, /unavailable/);
      assert.doesNotMatch(body, /secret|db\.example|postgresql/);
      assert.equal(queries.length, 0);
    });
    await t.test("approved isolated target checks the expected schema", async () => {
      process.env.HCSC_DATABASE_TARGET_FINGERPRINT = databaseTargetFingerprint(process.env.DATABASE_URL!).fingerprint;
      process.env.HCSC_PRODUCTION_DATABASE_FINGERPRINT = databaseTargetFingerprint("postgresql://user:secret@prod.example.com/hcsc").fingerprint;
      const response = await readiness();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, "ready");
      assert.equal(queries.length, 4);
      assert.match(queries[1], /ConnectedDomain/);
      assert.match(queries[2], /IntegrationEndpoint/);
      for (const table of ["User", "TwoFactorSecret", "PasswordResetToken", "OrganizationInvite", "AppSetting", "OrganizationSettings"]) {
        assert.ok(queries[3].includes(`"${table}"`));
      }
      assert.match(queries[3], /LIMIT 0/);
    });
    await t.test("query failure is sanitized", async () => {
      failQuery = true;
      const result = await probeDatabase();
      assert.equal(result.status, "unavailable");
      assert.doesNotMatch(JSON.stringify(result), /sensitive-host-or-credential/);
      failQuery = false;
    });
    await t.test("cached client cannot bypass a changed target policy", async () => {
      queries = [];
      process.env.HCSC_PRODUCTION_DATABASE_FINGERPRINT = process.env.HCSC_DATABASE_TARGET_FINGERPRINT;
      assert.equal((await readiness()).status, 503);
      assert.equal(queries.length, 0);
    });
  } finally {
    globalDb.prisma = previousClient;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
