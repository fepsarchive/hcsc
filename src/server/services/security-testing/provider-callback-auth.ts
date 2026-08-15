import "server-only";

import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifySecurityTestProviderCallback(authorizationHeader: string | null) {
  const configuredToken = process.env.STRIX_RUNNER_CALLBACK_TOKEN?.trim() ?? "";
  if (!configuredToken) return { configured: false as const, valid: false as const };

  const suppliedToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : "";
  return {
    configured: true as const,
    valid: Boolean(suppliedToken) && safeEqual(suppliedToken, configuredToken),
  };
}
