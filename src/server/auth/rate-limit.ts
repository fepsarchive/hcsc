import { createHash } from "node:crypto";

import type { NextResponse } from "next/server";

type RateLimitStoreEntry = {
  count: number;
  resetAt: number;
};

type RateLimitWindow = {
  name: string;
  limit: number;
  windowMs: number;
  scope: "ip" | "email_ip" | "session_ip" | "token_ip" | "user";
};

type RateLimitPolicyName =
  | "login"
  | "register"
  | "forgot_password"
  | "reset_password"
  | "verify_2fa"
  | "verify_2fa_recovery"
  | "two_factor_confirm"
  | "recovery_regenerate";

type RateLimitPolicyContext = {
  ipAddress?: string | null;
  email?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  tokenFingerprint?: string | null;
};

type ConsumeRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  source: "memory" | "upstash" | "disabled";
  scope: string;
};

type UpstashPipelineResponse = Array<{
  result?: number | string | null;
  error?: string | null;
}>;

const rateLimitStore = new Map<string, RateLimitStoreEntry>();
const UPSTASH_TIMEOUT_MS = 2000;
const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitWindow[]> = {
  login: [
    { name: "email_ip", scope: "email_ip", limit: 5, windowMs: 1000 * 60 * 5 },
    { name: "ip", scope: "ip", limit: 20, windowMs: 1000 * 60 * 10 },
  ],
  register: [
    { name: "email_ip", scope: "email_ip", limit: 3, windowMs: 1000 * 60 * 10 },
    { name: "ip", scope: "ip", limit: 10, windowMs: 1000 * 60 * 60 },
  ],
  forgot_password: [
    { name: "email_ip", scope: "email_ip", limit: 3, windowMs: 1000 * 60 * 15 },
    { name: "ip", scope: "ip", limit: 10, windowMs: 1000 * 60 * 60 },
  ],
  reset_password: [
    { name: "token_ip", scope: "token_ip", limit: 5, windowMs: 1000 * 60 * 15 },
  ],
  verify_2fa: [
    { name: "session_ip", scope: "session_ip", limit: 5, windowMs: 1000 * 60 * 5 },
  ],
  verify_2fa_recovery: [
    { name: "session_ip", scope: "session_ip", limit: 5, windowMs: 1000 * 60 * 10 },
  ],
  two_factor_confirm: [
    { name: "session_ip", scope: "session_ip", limit: 5, windowMs: 1000 * 60 * 5 },
  ],
  recovery_regenerate: [
    { name: "user", scope: "user", limit: 3, windowMs: 1000 * 60 * 60 },
  ],
};

let hasLoggedMissingUpstashWarning = false;
let hasLoggedDisabledProductionWarning = false;
const upstashErrorWarnings = new Set<string>();

function now() {
  return Date.now();
}

function cleanupExpiredEntries(currentTime: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= currentTime) {
      rateLimitStore.delete(key);
    }
  }
}

function isRateLimitDisabled() {
  return process.env.RATE_LIMIT_DISABLED === "true";
}

function shouldUseUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function fingerprintRateLimitValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function toSeconds(durationMs: number) {
  return Math.max(1, Math.ceil(durationMs / 1000));
}

function logMissingUpstashWarning() {
  if (process.env.NODE_ENV === "production" && !hasLoggedMissingUpstashWarning) {
    hasLoggedMissingUpstashWarning = true;
    console.warn("[rate-limit]", {
      event: "rate_limit_fallback",
      provider: "memory",
      mode: "missing_config",
      reason: "upstash_env_missing",
      environment: process.env.NODE_ENV,
    });
  }
}

function logDisabledProductionWarning() {
  if (process.env.NODE_ENV === "production" && !hasLoggedDisabledProductionWarning) {
    hasLoggedDisabledProductionWarning = true;
    console.warn("[rate-limit]", {
      event: "rate_limit_bypass_rejected",
      provider: "memory",
      mode: "production",
      reason: "rate_limit_disabled_ignored",
      environment: process.env.NODE_ENV,
    });
  }
}

function logUpstashFailure(reason: string, policyName?: string) {
  const warningKey = `${policyName ?? "unknown"}:${reason}`;

  if (!upstashErrorWarnings.has(warningKey)) {
    upstashErrorWarnings.add(warningKey);
    console.warn("[rate-limit]", {
      event: "rate_limit_fallback",
      provider: "upstash",
      mode: "fallback_to_memory",
      reason,
      policy: policyName ?? "unknown",
      environment: process.env.NODE_ENV,
    });
  }
}

function buildScopeIdentifier(scope: RateLimitWindow["scope"], context: RateLimitPolicyContext) {
  const ipAddress = context.ipAddress?.trim() || "unknown";

  switch (scope) {
    case "ip":
      return `ip:${ipAddress}`;
    case "email_ip":
      return `ip:${ipAddress}:email:${fingerprintRateLimitValue(normalizeEmail(context.email))}`;
    case "session_ip":
      return `ip:${ipAddress}:session:${fingerprintRateLimitValue(context.sessionId?.trim() || "unknown")}`;
    case "token_ip":
      return `ip:${ipAddress}:token:${context.tokenFingerprint?.trim() || "unknown"}`;
    case "user":
      return `user:${fingerprintRateLimitValue(context.userId?.trim() || "unknown")}`;
    default:
      return `ip:${ipAddress}`;
  }
}

function createWindowKey(policyName: RateLimitPolicyName, window: RateLimitWindow, context: RateLimitPolicyContext) {
  return `auth:${policyName}:${window.name}:${buildScopeIdentifier(window.scope, context)}`;
}

function resolveBestDecision(results: RateLimitDecision[]) {
  return results.reduce((current, candidate) => {
    if (candidate.remaining < current.remaining) {
      return candidate;
    }

    if (candidate.remaining === current.remaining && candidate.resetAt > current.resetAt) {
      return candidate;
    }

    return current;
  });
}

function consumeMemoryRateLimit(input: ConsumeRateLimitInput): RateLimitDecision {
  const currentTime = now();
  cleanupExpiredEntries(currentTime);

  const existing = rateLimitStore.get(input.key);

  if (!existing || existing.resetAt <= currentTime) {
    const resetAt = currentTime + input.windowMs;
    rateLimitStore.set(input.key, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      limit: input.limit,
      remaining: input.limit - 1,
      resetAt,
      retryAfterSeconds: toSeconds(input.windowMs),
      source: "memory",
      scope: input.key,
    };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      limit: input.limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: toSeconds(existing.resetAt - currentTime),
      source: "memory",
      scope: input.key,
    };
  }

  existing.count += 1;
  rateLimitStore.set(input.key, existing);

  return {
    allowed: true,
    limit: input.limit,
    remaining: Math.max(0, input.limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: toSeconds(existing.resetAt - currentTime),
    source: "memory",
    scope: input.key,
  };
}

async function consumeUpstashRateLimit(input: ConsumeRateLimitInput): Promise<RateLimitDecision> {
  const currentTime = now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("upstash_timeout"), UPSTASH_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", input.key],
        ["PEXPIRE", input.key, String(input.windowMs), "NX"],
        ["PTTL", input.key],
      ]),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("upstash_timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`upstash_http_${response.status}`);
  }

  const payload = (await response.json()) as UpstashPipelineResponse;
  const count = Number(payload[0]?.result ?? 0);
  const ttl = Number(payload[2]?.result ?? input.windowMs);

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("upstash_invalid_count");
  }

  const effectiveTtl = ttl > 0 ? ttl : input.windowMs;
  const resetAt = currentTime + effectiveTtl;

  return {
    allowed: count <= input.limit,
    limit: input.limit,
    remaining: Math.max(0, input.limit - count),
    resetAt,
    retryAfterSeconds: toSeconds(effectiveTtl),
    source: "upstash",
    scope: input.key,
  };
}

async function consumeDistributedRateLimit(input: ConsumeRateLimitInput, policyName: RateLimitPolicyName) {
  if (isRateLimitDisabled()) {
    if (process.env.NODE_ENV === "production") {
      logDisabledProductionWarning();
    } else {
      return {
        allowed: true,
        limit: input.limit,
        remaining: input.limit,
        resetAt: now() + input.windowMs,
        retryAfterSeconds: toSeconds(input.windowMs),
        source: "disabled" as const,
        scope: input.key,
      };
    }
  }

  if (!shouldUseUpstash()) {
    logMissingUpstashWarning();
    return consumeMemoryRateLimit(input);
  }

  try {
    return await consumeUpstashRateLimit(input);
  } catch (error) {
    logUpstashFailure(error instanceof Error ? error.message : "unknown_upstash_error", policyName);
    return consumeMemoryRateLimit(input);
  }
}

export function createRateLimitTokenFingerprint(token: string) {
  return fingerprintRateLimitValue(token.trim());
}

export async function consumeRateLimitPolicy(
  policyName: RateLimitPolicyName,
  context: RateLimitPolicyContext,
) {
  const windows = RATE_LIMIT_POLICIES[policyName];
  const results = await Promise.all(
    windows.map(async (window) => {
      const decision = await consumeDistributedRateLimit({
        key: createWindowKey(policyName, window, context),
        limit: window.limit,
        windowMs: window.windowMs,
      }, policyName);

      return {
        ...decision,
        scope: window.name,
      };
    }),
  );

  const blockedDecision = results.find((decision) => !decision.allowed);

  return blockedDecision ?? resolveBestDecision(results);
}

export function applyRateLimitHeaders(response: NextResponse, decision: RateLimitDecision) {
  response.headers.set("X-RateLimit-Limit", String(decision.limit));
  response.headers.set("X-RateLimit-Remaining", String(decision.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(decision.resetAt / 1000)));
  response.headers.set("X-RateLimit-Policy", decision.scope);

  if (!decision.allowed) {
    response.headers.set("Retry-After", String(decision.retryAfterSeconds));
  }

  return response;
}
