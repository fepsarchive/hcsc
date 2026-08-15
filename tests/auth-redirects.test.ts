import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { resolveAppShellRedirect } from "../src/lib/auth-redirects";
import { sanitizeSecurityMetadata } from "../src/lib/security-metadata";
import { calculateEventRisk, getRiskLevel } from "../src/lib/security-risk-scoring";
import {
  getEffectiveSecurityTestAuthorizationStatus,
  isSecurityTestAuthorizationActive,
  normalizeSecurityTestScope,
} from "../src/lib/security-test-policy";
import type { AppUser, AuthState } from "../src/types";

const unauthenticated: AuthState = {
  hydrated: true,
  isAuthenticated: false,
  requiresTwoFactor: false,
  is2FAVerified: false,
  currentUserId: null,
  sessionStartedAt: null,
  lastLoginAt: null,
};

const pendingTwoFactor: AuthState = {
  ...unauthenticated,
  requiresTwoFactor: true,
};

const verified: AuthState = {
  hydrated: true,
  isAuthenticated: true,
  requiresTwoFactor: false,
  is2FAVerified: true,
  currentUserId: "user-1",
  sessionStartedAt: "2026-06-11T12:00:00.000Z",
  lastLoginAt: "2026-06-11T12:00:00.000Z",
};

const user: AppUser = {
  id: "user-1",
  name: "Normal User",
  email: "user@example.test",
  role: "Cloud Security Analyst",
  platformRole: "USER",
  isSystemOwner: false,
  avatarInitials: "NU",
  department: "Security",
  mfaEnabled: true,
  status: "active",
  lastLoginAt: "2026-06-11T12:00:00.000Z",
};

const owner: AppUser = {
  ...user,
  id: "owner-1",
  email: "owner@example.test",
  platformRole: "ADMIN",
  isSystemOwner: true,
};

test("verify-2fa without pending state redirects to login", () => {
  assert.equal(
    resolveAppShellRedirect({
      pathname: "/verify-2fa",
      auth: unauthenticated,
      currentUser: null,
      onboardingCompleted: false,
    }),
    "/login",
  );
});

test("pending 2FA session can stay on verify-2fa but cannot visit protected pages", () => {
  assert.equal(
    resolveAppShellRedirect({
      pathname: "/verify-2fa",
      auth: pendingTwoFactor,
      currentUser: null,
      onboardingCompleted: false,
    }),
    null,
  );

  assert.equal(
    resolveAppShellRedirect({
      pathname: "/dashboard",
      auth: pendingTwoFactor,
      currentUser: null,
      onboardingCompleted: false,
    }),
    "/verify-2fa",
  );
});

test("cleared pending state allows the login page to stay on login", () => {
  assert.equal(
    resolveAppShellRedirect({
      pathname: "/login",
      auth: unauthenticated,
      currentUser: null,
      onboardingCompleted: false,
    }),
    null,
  );
});

test("verified users are moved away from verify-2fa to their target area", () => {
  assert.equal(
    resolveAppShellRedirect({
      pathname: "/verify-2fa",
      auth: verified,
      currentUser: user,
      onboardingCompleted: true,
    }),
    "/dashboard",
  );

  assert.equal(
    resolveAppShellRedirect({
      pathname: "/verify-2fa",
      auth: verified,
      currentUser: owner,
      onboardingCompleted: true,
    }),
    "/admin",
  );
});

test("verify-2fa switch account action clears session before routing to login", () => {
  const source = readFileSync(
    new URL("../src/app/verify-2fa/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const logout = useSecurityConsoleStore/);
  assert.match(source, /await logout\(\)/);
  assert.match(source, /router\.replace\("\/login"\)/);
  assert.doesNotMatch(source, /primaryHref="\/login"/);
});

test("trap endpoint remains a safe deception surface with rate limiting", () => {
  const routeSource = readFileSync(
    new URL("../src/app/api/trap/[trapSlug]/route.ts", import.meta.url),
    "utf8",
  );
  const serviceSource = readFileSync(
    new URL("../src/server/services/deception/trap-service.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /Resource unavailable/);
  assert.match(routeSource, /status:\s*404/);
  assert.match(routeSource, /never returns secrets/);
  assert.match(serviceSource, /TRAP_RATE_LIMIT_MAX_REQUESTS/);
  assert.match(serviceSource, /createAuditLog/);
  assert.match(serviceSource, /createSecurityEvent/);
  assert.match(serviceSource, /riskScore:\s*94/);
});

test("risk score levels are deterministic", () => {
  assert.equal(getRiskLevel(0), "low");
  assert.equal(getRiskLevel(24), "low");
  assert.equal(getRiskLevel(25), "medium");
  assert.equal(getRiskLevel(50), "high");
  assert.equal(getRiskLevel(75), "critical");
});

test("event risk calculation weights critical trap events", () => {
  const result = calculateEventRisk({
    severity: "critical",
    category: "trap_triggered",
    targetType: "deception_asset",
  });

  assert.equal(result.level, "critical");
  assert.ok(result.score >= 75);
  assert.ok(result.reasons.some((reason) => reason.includes("trap_triggered")));
});

test("security event metadata sanitizer redacts secrets recursively", () => {
  const sanitized = sanitizeSecurityMetadata({
    email: "analyst@hcsc.local",
    password: "demo123",
    nested: {
      sessionToken: "secret-token",
      safe: "visible",
    },
  });

  assert.deepEqual(sanitized, {
    email: "analyst@hcsc.local",
    password: "[redacted]",
    nested: {
      sessionToken: "[redacted]",
      safe: "visible",
    },
  });
});

test("high severity security events create notification linkage", () => {
  const serviceSource = readFileSync(
    new URL("../src/server/security/security-event-service.ts", import.meta.url),
    "utf8",
  );

  assert.match(serviceSource, /notifyOrganizationMembers/);
  assert.match(serviceSource, /shouldNotify/);
  assert.match(serviceSource, /riskScore/);
});

test("security test authorization expires deterministically", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");

  assert.equal(
    isSecurityTestAuthorizationActive(
      { status: "active", expiresAt: "2026-08-16T12:00:00.000Z" },
      now,
    ),
    true,
  );
  assert.equal(
    isSecurityTestAuthorizationActive(
      { status: "active", expiresAt: "2026-08-14T12:00:00.000Z" },
      now,
    ),
    false,
  );
  assert.equal(
    getEffectiveSecurityTestAuthorizationStatus(
      { status: "revoked", expiresAt: "2030-01-01T00:00:00.000Z" },
      now,
    ),
    "revoked",
  );
});

test("security test scope normalization trims and deduplicates entries", () => {
  assert.deepEqual(normalizeSecurityTestScope("/api/*, /admin/*\n/api/*\n"), ["/api/*", "/admin/*"]);
});

test("adversary validation enforces permission, explicit authorization and production lock", () => {
  const routeSource = readFileSync(
    new URL("../src/app/api/adversary-validation/runs/route.ts", import.meta.url),
    "utf8",
  );
  const serviceSource = readFileSync(
    new URL("../src/server/services/security-testing/security-test-service.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /permission:\s*"run_security_test"/);
  assert.match(routeSource, /explicitAuthorizationConfirmed:\s*z\.literal\(true\)/);
  assert.match(serviceSource, /isSecurityTestAuthorizationActive/);
  assert.match(serviceSource, /HCSC_SECURITY_TEST_ALLOW_PRODUCTION/);
  assert.match(serviceSource, /PRODUCTION_TARGET_BLOCKED/);
});

test("Strix callback and runner enforce token, allowlist and idempotent findings", () => {
  const callbackSource = readFileSync(
    new URL("../src/app/api/adversary-validation/provider/callback/route.ts", import.meta.url),
    "utf8",
  );
  const callbackAuthSource = readFileSync(
    new URL("../src/server/services/security-testing/provider-callback-auth.ts", import.meta.url),
    "utf8",
  );
  const serviceSource = readFileSync(
    new URL("../src/server/services/security-testing/security-test-service.ts", import.meta.url),
    "utf8",
  );
  const runnerSource = readFileSync(
    new URL("../services/strix-runner/server.mjs", import.meta.url),
    "utf8",
  );

  assert.match(callbackSource, /verifySecurityTestProviderCallback/);
  assert.match(callbackAuthSource, /timingSafeEqual/);
  assert.match(callbackAuthSource, /STRIX_RUNNER_CALLBACK_TOKEN/);
  assert.match(serviceSource, /securityTestFinding\.upsert/);
  assert.match(serviceSource, /EXTERNAL_RUN_MISMATCH/);
  assert.match(runnerSource, /STRIX_ALLOWED_TARGETS/);
  assert.match(runnerSource, /allowedTargets\.has\(target\)/);
  assert.match(runnerSource, /shell:\s*false/);
  assert.match(runnerSource, /strixReady/);
  assert.match(runnerSource, /dockerReady/);
  assert.doesNotMatch(runnerSource, /env:\s*process\.env/);
});
