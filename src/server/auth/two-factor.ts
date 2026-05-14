import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/server/db/prisma";

const DEMO_TWO_FACTOR_CODE = "123456";
const ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR = process.env.NODE_ENV !== "production";
const TOTP_TIME_STEP_SECONDS = 30;
const TOTP_ALLOWED_DRIFT_STEPS = 1;
const TOTP_DIGITS = 6;
const TOTP_ENCRYPTION_PREFIX = "totp:v1";
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const LEGACY_DEMO_SECRET_PREFIX = "demo-totp-secret-";

type TotpVerificationInput = {
  code: string;
  secret?: string | null;
  allowedDriftSteps?: number;
};

type TotpVerificationResult = {
  valid: boolean;
  matchedStep: number | null;
};

function normalizeCode(code: string) {
  return code.trim().replace(/\s+/g, "");
}

function getTwoFactorIssuer() {
  return process.env.TOTP_ISSUER?.trim() || "Hybrid Cloud Security Console";
}

function getTwoFactorEncryptionKeyMaterial() {
  const candidate =
    process.env.TWO_FACTOR_ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim();

  if (candidate) {
    return candidate;
  }

  if (process.env.NODE_ENV !== "production") {
    return "hcsc-development-two-factor-key";
  }

  throw new Error("SESSION_SECRET veya TWO_FACTOR_ENCRYPTION_KEY olmadan 2FA secret şifrelenemez.");
}

function deriveEncryptionKey() {
  return createHash("sha256").update(getTwoFactorEncryptionKeyMaterial()).digest();
}

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function encodeBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let current = 0;
  const output: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index === -1) {
      throw new Error("Geçersiz Base32 secret.");
    }

    current = (current << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function buildCounterBuffer(step: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(step));
  return buffer;
}

function generateTotpCode(secret: string, step: number) {
  const key = decodeBase32(secret);
  const digest = createHmac("sha1", key).update(buildCounterBuffer(step)).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

function isEncryptedTwoFactorSecret(secret?: string | null) {
  return Boolean(secret?.startsWith(`${TOTP_ENCRYPTION_PREFIX}:`));
}

function isLegacyDemoSecret(secret?: string | null) {
  return Boolean(secret?.startsWith(LEGACY_DEMO_SECRET_PREFIX));
}

function looksLikeBase32Secret(secret?: string | null) {
  return Boolean(secret && /^[A-Z2-7]{16,}$/.test(secret.replace(/\s+/g, "").toUpperCase()));
}

function safeCodeMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateTwoFactorSecret() {
  return encodeBase32(randomBytes(20));
}

export function encryptTwoFactorSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${TOTP_ENCRYPTION_PREFIX}:${toBase64Url(iv)}:${toBase64Url(tag)}:${toBase64Url(encrypted)}`;
}

export function decryptTwoFactorSecret(secret?: string | null) {
  if (!secret) {
    return null;
  }

  if (!isEncryptedTwoFactorSecret(secret)) {
    return secret;
  }

  const [, version, ivValue, tagValue, encryptedValue] = secret.split(":");

  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Geçersiz 2FA secret formatı.");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveEncryptionKey(), fromBase64Url(ivValue));
  decipher.setAuthTag(fromBase64Url(tagValue));

  const decrypted = Buffer.concat([
    decipher.update(fromBase64Url(encryptedValue)),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function createTwoFactorEnrollmentSecret() {
  const manualSecret = generateTwoFactorSecret();

  return {
    manualSecret,
    secret: encryptTwoFactorSecret(manualSecret),
  };
}

export function buildOtpAuthUrl(input: {
  email: string;
  secret: string;
  issuer?: string;
}) {
  const issuer = input.issuer?.trim() || getTwoFactorIssuer();
  const label = `${issuer}:${input.email.trim().toLowerCase()}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_TIME_STEP_SECONDS),
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function verifyTwoFactorCode(input: TotpVerificationInput): TotpVerificationResult {
  const normalizedCode = normalizeCode(input.code);

  if (!/^\d{6}$/.test(normalizedCode)) {
    return { valid: false, matchedStep: null };
  }

  const storedSecret = input.secret;

  if (!storedSecret) {
    return {
      valid: ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR && normalizedCode === DEMO_TWO_FACTOR_CODE,
      matchedStep: null,
    };
  }

  const decryptedSecret = decryptTwoFactorSecret(storedSecret);

  if (!decryptedSecret) {
    return { valid: false, matchedStep: null };
  }

  if (ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR && isLegacyDemoSecret(decryptedSecret)) {
    return {
      valid: normalizedCode === DEMO_TWO_FACTOR_CODE,
      matchedStep: null,
    };
  }

  if (!looksLikeBase32Secret(decryptedSecret)) {
    return { valid: false, matchedStep: null };
  }

  const nowStep = Math.floor(Date.now() / 1000 / TOTP_TIME_STEP_SECONDS);
  const allowedDriftSteps = input.allowedDriftSteps ?? TOTP_ALLOWED_DRIFT_STEPS;

  for (let offset = -allowedDriftSteps; offset <= allowedDriftSteps; offset += 1) {
    const candidateStep = nowStep + offset;
    const expectedCode = generateTotpCode(decryptedSecret, candidateStep);

    if (safeCodeMatch(expectedCode, normalizedCode)) {
      return {
        valid: true,
        matchedStep: candidateStep,
      };
    }
  }

  return { valid: false, matchedStep: null };
}

export function isTwoFactorReady(secret?: string | null) {
  return Boolean(secret);
}

export function isTwoFactorEnrolled(input: {
  secret?: string | null;
  enabledAt?: Date | null;
  enrolledAt?: Date | null;
}) {
  if (!input.secret || (!input.enabledAt && !input.enrolledAt)) {
    return false;
  }

  if (isEncryptedTwoFactorSecret(input.secret)) {
    return true;
  }

  return ALLOW_DEVELOPMENT_DEMO_TWO_FACTOR && isLegacyDemoSecret(input.secret);
}

export function shouldRotateTwoFactorSecret(secret?: string | null) {
  if (!secret) {
    return true;
  }

  if (isLegacyDemoSecret(secret)) {
    return true;
  }

  if (isEncryptedTwoFactorSecret(secret)) {
    return false;
  }

  if (looksLikeBase32Secret(secret)) {
    return false;
  }

  return true;
}

export function isReplayProtectedStep(input: {
  matchedStep?: number | null;
  lastVerifiedStep?: number | null;
}) {
  if (input.matchedStep == null || input.lastVerifiedStep == null) {
    return false;
  }

  return input.matchedStep <= input.lastVerifiedStep;
}

export function getTwoFactorEnrollmentContext(input: {
  email: string;
  storedSecret: string;
  issuer?: string;
}) {
  const manualSecret = decryptTwoFactorSecret(input.storedSecret);

  if (!manualSecret || !looksLikeBase32Secret(manualSecret)) {
    throw new Error("2FA kurulum anahtarı hazırlanamadı.");
  }

  const issuer = input.issuer?.trim() || getTwoFactorIssuer();

  return {
    issuer,
    manualSecret,
    otpauthUrl: buildOtpAuthUrl({
      email: input.email,
      secret: manualSecret,
      issuer,
    }),
  };
}

export async function persistSuccessfulTwoFactorVerification(input: {
  sessionId: string;
  userId: string;
  twoFactorSecretId: string;
  matchedStep?: number | null;
  markEnrollment?: boolean;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.twoFactorSecret.update({
      where: { id: input.twoFactorSecretId },
      data: {
        enabledAt: input.markEnrollment ? now : undefined,
        enrolledAt: input.markEnrollment ? now : undefined,
        lastVerifiedAt: now,
        lastVerifiedStep: input.matchedStep ?? undefined,
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: {
        mfaEnabled: true,
      },
    });

    return tx.session.update({
      where: { id: input.sessionId },
      data: {
        status: "active",
        is2FAVerified: true,
        lastSeenAt: now,
      },
      include: {
      user: {
        include: {
          twoFactorSecret: true,
          recoveryCodes: {
            where: {
              usedAt: null,
            },
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      },
        organization: true,
      },
    });
  });
}
