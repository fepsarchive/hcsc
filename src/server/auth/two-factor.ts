const DEMO_TWO_FACTOR_CODE = "123456";
const ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR = process.env.NODE_ENV !== "production";

export function verifyTwoFactorCode(code: string, secret?: string | null) {
  const normalized = code.trim();

  if (!normalized || normalized.length !== 6) {
    return false;
  }

  if (!secret) {
    return ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR && normalized === DEMO_TWO_FACTOR_CODE;
  }

  if (ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR) {
    return normalized === DEMO_TWO_FACTOR_CODE;
  }

  return false;
}

export function isTwoFactorReady(secret?: string | null) {
  return Boolean(secret);
}
