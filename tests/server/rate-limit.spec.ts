import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { consumeRateLimitPolicy } from "../../src/server/auth/rate-limit";

test("production rate limiting rejects incomplete or failed Redis commands", async () => {
  const env = { NODE_ENV: "production", UPSTASH_REDIS_REST_URL: "https://cache.example.com", UPSTASH_REDIS_REST_TOKEN: "test-only", RATE_LIMIT_DISABLED: "false" };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  let payload: unknown;
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(payload), { status: 200 }));
  try {
    for (payload of [
      [{ result: 1 }, { error: "expiry failed" }, { result: 60000 }],
      [{ result: 1 }, { result: 1 }, { error: "ttl failed" }],
      [{ result: 1 }, { result: 0 }, { result: -1 }],
      [{ result: 1 }],
      [{ result: true }, { result: 1 }, { result: 60000 }],
      [{ result: 1.5 }, { result: 1 }, { result: 60000 }],
      null,
    ]) {
      const decision = await consumeRateLimitPolicy("domain_check", { userId: "fixture-user" });
      assert.equal(decision.allowed, false, JSON.stringify(payload));
      assert.equal(decision.source, "upstash");
    }
    for (const count of [1, 12, 13]) {
      payload = [{ result: count }, { result: count === 1 ? 1 : 0 }, { result: 60000 }];
      const decision = await consumeRateLimitPolicy("domain_check", { userId: "fixture-user" });
      assert.equal(decision.allowed, count <= 12);
      assert.equal(decision.remaining, Math.max(0, 12 - count));
    }
  } finally {
    fetchMock.mock.restore();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
