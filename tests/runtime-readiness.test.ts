import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateRuntimeReadiness, type RuntimeEnvironment } from "../src/lib/runtime-readiness";

const validProduction: RuntimeEnvironment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.test:5432/hcsc?sslmode=require",
  APP_URL: "https://www.hcsc.space",
  SESSION_SECRET: "session-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
  JWT_SECRET: "jwt-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
  TWO_FACTOR_ENCRYPTION_KEY: "two-factor-key-0123456789-abcdefghijklmnopqrstuvwxyz",
  RECOVERY_CODE_HASH_KEY: "recovery-key-0123456789-abcdefghijklmnopqrstuvwxyz",
  INTEGRATION_ENCRYPTION_KEY: "integration-key-0123456789-abcdefghijklmnopqrstuvwxyz",
  RESEND_API_KEY: "re_live_key",
  MAIL_FROM: "HCSC <security@hcsc.space>",
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "redis-token",
  SYSTEM_OWNER_EMAIL: "owner@hcsc.space",
  HCSC_TEST_AUTH_BYPASS_ENABLED: "false",
  HCSC_SECURITY_TEST_PROVIDER: "managed",
  STRIX_API_BASE_URL: "https://app.strix.ai/api/v1",
  STRIX_API_TOKEN: "strix-token",
};

describe("runtime readiness", () => {
  it("accepts a hardened managed-Strix production configuration", () => {
    const result = evaluateRuntimeReadiness(validProduction);
    assert.equal(result.ready, true);
    assert.deepEqual(result.issues, []);
  });

  it("rejects placeholders, local HTTP and an enabled test bypass", () => {
    const result = evaluateRuntimeReadiness({
      ...validProduction,
      APP_URL: "http://localhost:3000",
      SESSION_SECRET: "change-me-in-production",
      HCSC_TEST_AUTH_BYPASS_ENABLED: "true",
    });

    assert.equal(result.ready, false);
    assert.ok(result.issues.some((issue) => issue.key === "APP_URL"));
    assert.ok(result.issues.some((issue) => issue.key === "SESSION_SECRET"));
    assert.ok(result.issues.some((issue) => issue.key === "HCSC_TEST_AUTH_BYPASS_ENABLED"));
  });

  it("does not allow the synthetic provider in production", () => {
    const result = evaluateRuntimeReadiness({ ...validProduction, HCSC_SECURITY_TEST_PROVIDER: "demo" });
    assert.equal(result.ready, false);
    assert.ok(result.issues.some((issue) => issue.key === "HCSC_SECURITY_TEST_PROVIDER"));
  });

  it("requires every self-hosted Strix credential", () => {
    const result = evaluateRuntimeReadiness({
      ...validProduction,
      HCSC_SECURITY_TEST_PROVIDER: "self_hosted",
      STRIX_API_TOKEN: undefined,
      STRIX_RUNNER_URL: "https://strix-runner.example.test",
    });
    assert.equal(result.ready, false);
    assert.ok(result.issues.some((issue) => issue.key === "STRIX_RUNNER_TOKEN"));
    assert.ok(result.issues.some((issue) => issue.key === "STRIX_RUNNER_CALLBACK_TOKEN"));
  });

  it("keeps local development usable while exposing warnings", () => {
    const result = evaluateRuntimeReadiness({ NODE_ENV: "development", HCSC_SECURITY_TEST_PROVIDER: "demo" });
    assert.equal(result.ready, true);
    assert.ok(result.warnings.length > 0);
  });
});
