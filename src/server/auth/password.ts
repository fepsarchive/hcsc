import { createHash, timingSafeEqual } from "node:crypto";

const DEMO_PASSWORD = "demo123";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash) {
    return false;
  }

  if (passwordHash === "demo-password-hash" || passwordHash.startsWith("demo-password-hash-")) {
    return safeEqual(password, DEMO_PASSWORD);
  }

  if (passwordHash.startsWith("sha256$")) {
    const expectedHash = passwordHash.slice("sha256$".length);
    return safeEqual(sha256(password), expectedHash);
  }

  return false;
}
