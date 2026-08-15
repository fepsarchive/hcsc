import type { Prisma } from "@prisma/client";

const sensitiveKeyPattern = /(secret|token|password|passcode|hash|cookie|authorization|database_url|direct_url|private_key|totp|recovery_code)/i;

function sanitizeValue(value: unknown, depth = 0): Prisma.InputJsonValue {
  if (depth > 4) return "[redacted-depth]";
  if (value === null) return "[null]";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (typeof value === "string" && value.length > 512) return `${value.slice(0, 512)}...`;
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 25).map((entry) => sanitizeValue(entry, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([key, entry]) => [
          key,
          sensitiveKeyPattern.test(key) ? "[redacted]" : sanitizeValue(entry, depth + 1),
        ]),
    );
  }

  return String(value);
}

export function sanitizeSecurityMetadata(value: unknown): Prisma.InputJsonValue {
  return sanitizeValue(value);
}
