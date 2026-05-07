const DEMO_TWO_FACTOR_CODE = "123456";

export function verifyTwoFactorCode(code: string, secret?: string | null) {
  const normalized = code.trim();

  if (!normalized || normalized.length !== 6) {
    return false;
  }

  if (!secret) {
    return normalized === DEMO_TWO_FACTOR_CODE;
  }

  return normalized === DEMO_TWO_FACTOR_CODE;
}

export function isTwoFactorReady(secret?: string | null) {
  return Boolean(secret);
}
