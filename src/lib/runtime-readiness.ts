export type RuntimeEnvironment = Record<string, string | undefined>;

export type RuntimeReadinessIssue = {
  key: string;
  code: "missing" | "invalid" | "unsafe";
  message: string;
};

export type RuntimeReadiness = {
  environment: "development" | "test" | "production";
  provider: "demo" | "managed" | "self_hosted" | "invalid";
  ready: boolean;
  issues: RuntimeReadinessIssue[];
  warnings: string[];
};

const productionRequiredKeys = [
  "DATABASE_URL",
  "APP_URL",
  "SESSION_SECRET",
  "JWT_SECRET",
  "TWO_FACTOR_ENCRYPTION_KEY",
  "RECOVERY_CODE_HASH_KEY",
  "INTEGRATION_ENCRYPTION_KEY",
  "RESEND_API_KEY",
  "MAIL_FROM",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

const secretKeys = [
  "SESSION_SECRET",
  "JWT_SECRET",
  "TWO_FACTOR_ENCRYPTION_KEY",
  "RECOVERY_CODE_HASH_KEY",
  "INTEGRATION_ENCRYPTION_KEY",
] as const;

const unsafeSecretFragments = ["change-me", "changeme", "example", "replace-me", "demo123", "password"];

function value(env: RuntimeEnvironment, key: string) {
  return env[key]?.trim() ?? "";
}

function isHttpsUrl(input: string) {
  try {
    const url = new URL(input);
    const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
    return url.protocol === "https:" && !localHost;
  } catch {
    return false;
  }
}

function isStrongSecret(input: string) {
  const normalized = input.toLowerCase();
  return input.length >= 32 && !unsafeSecretFragments.some((fragment) => normalized.includes(fragment));
}

function normalizeEnvironment(input: string): RuntimeReadiness["environment"] {
  if (input === "production" || input === "test") return input;
  return "development";
}

function normalizeProvider(input: string): RuntimeReadiness["provider"] {
  if (input === "demo" || input === "managed" || input === "self_hosted") return input;
  return "invalid";
}

export function evaluateRuntimeReadiness(env: RuntimeEnvironment): RuntimeReadiness {
  const environment = normalizeEnvironment(value(env, "NODE_ENV"));
  const provider = normalizeProvider(value(env, "HCSC_SECURITY_TEST_PROVIDER") || "demo");
  const issues: RuntimeReadinessIssue[] = [];
  const warnings: string[] = [];

  if (environment !== "production") {
    warnings.push("Production-only configuration rules were not enforced in this environment.");
    if (provider === "demo") warnings.push("Synthetic security-test provider is active.");
    return { environment, provider, ready: true, issues, warnings };
  }

  for (const key of productionRequiredKeys) {
    if (!value(env, key)) {
      issues.push({ key, code: "missing", message: `${key} is required in production.` });
    }
  }

  if (!value(env, "SYSTEM_OWNER_EMAIL") && !value(env, "SYSTEM_OWNER_USER_ID")) {
    issues.push({
      key: "SYSTEM_OWNER_EMAIL or SYSTEM_OWNER_USER_ID",
      code: "missing",
      message: "A system owner identity must be configured in production.",
    });
  }

  for (const key of secretKeys) {
    const secret = value(env, key);
    if (secret && !isStrongSecret(secret)) {
      issues.push({ key, code: "unsafe", message: `${key} must be at least 32 characters and must not be a placeholder.` });
    }
  }

  const appUrl = value(env, "APP_URL");
  if (appUrl && !isHttpsUrl(appUrl)) {
    issues.push({ key: "APP_URL", code: "invalid", message: "APP_URL must be a non-local HTTPS URL in production." });
  }

  const cacheUrl = value(env, "UPSTASH_REDIS_REST_URL");
  if (cacheUrl && !isHttpsUrl(cacheUrl)) {
    issues.push({
      key: "UPSTASH_REDIS_REST_URL",
      code: "invalid",
      message: "UPSTASH_REDIS_REST_URL must be a non-local HTTPS URL in production.",
    });
  }

  if (value(env, "HCSC_TEST_AUTH_BYPASS_ENABLED").toLowerCase() === "true") {
    issues.push({
      key: "HCSC_TEST_AUTH_BYPASS_ENABLED",
      code: "unsafe",
      message: "Test authentication bypass must be disabled in production.",
    });
  }

  if (provider === "demo") {
    issues.push({
      key: "HCSC_SECURITY_TEST_PROVIDER",
      code: "unsafe",
      message: "Synthetic demo scanning cannot be the production security-test provider.",
    });
  } else if (provider === "invalid") {
    issues.push({
      key: "HCSC_SECURITY_TEST_PROVIDER",
      code: "invalid",
      message: "Security-test provider must be managed or self_hosted in production.",
    });
  } else if (provider === "managed") {
    if (!value(env, "STRIX_API_TOKEN")) {
      issues.push({ key: "STRIX_API_TOKEN", code: "missing", message: "Managed Strix requires STRIX_API_TOKEN." });
    }
    const baseUrl = value(env, "STRIX_API_BASE_URL") || "https://app.strix.ai/api/v1";
    if (!isHttpsUrl(baseUrl)) {
      issues.push({ key: "STRIX_API_BASE_URL", code: "invalid", message: "Managed Strix API must use a non-local HTTPS URL." });
    }
  } else {
    for (const key of ["STRIX_RUNNER_URL", "STRIX_RUNNER_TOKEN", "STRIX_RUNNER_CALLBACK_TOKEN"] as const) {
      if (!value(env, key)) {
        issues.push({ key, code: "missing", message: `${key} is required for a self-hosted Strix runner.` });
      }
    }
    const runnerUrl = value(env, "STRIX_RUNNER_URL");
    if (runnerUrl && !isHttpsUrl(runnerUrl)) {
      issues.push({ key: "STRIX_RUNNER_URL", code: "invalid", message: "Self-hosted Strix runner must use a non-local HTTPS URL." });
    }
  }

  return { environment, provider, ready: issues.length === 0, issues, warnings };
}
