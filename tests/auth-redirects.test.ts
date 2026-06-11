import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { resolveAppShellRedirect } from "../src/lib/auth-redirects";
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
  assert.match(serviceSource, /notifyOrganizationMembers/);
});
