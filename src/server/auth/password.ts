import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DEMO_PASSWORD = "demo123";
const ALLOW_DEVELOPMENT_DEMO_PASSWORD = process.env.NODE_ENV !== "production";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function scryptHash(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString("hex");
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

  if (
    ALLOW_DEVELOPMENT_DEMO_PASSWORD &&
    (passwordHash === "demo-password-hash" || passwordHash.startsWith("demo-password-hash-"))
  ) {
    return safeEqual(password, DEMO_PASSWORD);
  }

  if (passwordHash.startsWith("sha256$")) {
    const expectedHash = passwordHash.slice("sha256$".length);
    return safeEqual(sha256(password), expectedHash);
  }

  if (passwordHash.startsWith("scrypt$")) {
    const [, salt, expectedHash] = passwordHash.split("$");

    if (!salt || !expectedHash) {
      return false;
    }

    return safeEqual(scryptHash(password, salt), expectedHash);
  }

  return false;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptHash(password, salt)}`;
}
