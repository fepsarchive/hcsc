import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/server/db/prisma";

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_PREFIX = "HCSC";
const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_HASH_PREFIX = "hmac-sha256";
const LEGACY_RECOVERY_CODE_HASH_PREFIX = "sha256";

type RecoveryCodeClient = Pick<typeof prisma, "recoveryCode">;

function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function randomSegment(length: number) {
  const bytes = randomBytes(length);
  let output = "";

  for (let index = 0; index < length; index += 1) {
    output += RECOVERY_CODE_ALPHABET[bytes[index] % RECOVERY_CODE_ALPHABET.length];
  }

  return output;
}

function getRecoveryCodeHashKeyMaterial() {
  const candidate =
    process.env.RECOVERY_CODE_HASH_KEY?.trim() ||
    process.env.TWO_FACTOR_ENCRYPTION_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim();

  if (candidate) {
    return candidate;
  }

  if (process.env.NODE_ENV !== "production") {
    return "hcsc-development-recovery-code-key";
  }

  throw new Error("SESSION_SECRET, TWO_FACTOR_ENCRYPTION_KEY veya RECOVERY_CODE_HASH_KEY olmadan recovery code hash üretilemez.");
}

function hashRecoveryCodeLegacy(code: string) {
  const normalized = normalizeRecoveryCode(code);
  return `${LEGACY_RECOVERY_CODE_HASH_PREFIX}$${createHash("sha256").update(normalized).digest("hex")}`;
}

export function createRecoveryCode() {
  return `${RECOVERY_CODE_PREFIX}-${randomSegment(4)}-${randomSegment(4)}`;
}

export function hashRecoveryCode(code: string) {
  const normalized = normalizeRecoveryCode(code);
  return `${RECOVERY_CODE_HASH_PREFIX}$${createHmac("sha256", getRecoveryCodeHashKeyMaterial()).update(normalized).digest("hex")}`;
}

export function buildRecoveryCodeSet(count = RECOVERY_CODE_COUNT) {
  const uniqueCodes = new Set<string>();

  while (uniqueCodes.size < count) {
    uniqueCodes.add(createRecoveryCode());
  }

  const plainCodes = Array.from(uniqueCodes);
  const hashedCodes = plainCodes.map((code) => ({
    codeHash: hashRecoveryCode(code),
  }));

  return {
    plainCodes,
    hashedCodes,
  };
}

export async function replaceRecoveryCodesForUser(input: {
  userId: string;
  count?: number;
  client?: RecoveryCodeClient;
}) {
  const { plainCodes, hashedCodes } = buildRecoveryCodeSet(input.count);
  const writeCodes = async (client: RecoveryCodeClient) => {
    await client.recoveryCode.deleteMany({
      where: {
        userId: input.userId,
      },
    });

    await client.recoveryCode.createMany({
      data: hashedCodes.map((entry) => ({
        userId: input.userId,
        codeHash: entry.codeHash,
      })),
    });
  };

  if (input.client) {
    await writeCodes(input.client);
  } else {
    await prisma.$transaction(async (transaction) => {
      await writeCodes(transaction);
    });
  }

  return plainCodes;
}

export async function ensureRecoveryCodesForUser(input: {
  userId: string;
  count?: number;
  client?: RecoveryCodeClient;
}) {
  const client = input.client ?? prisma;
  const existingCount = await client.recoveryCode.count({
    where: {
      userId: input.userId,
    },
  });

  if (existingCount > 0) {
    return null;
  }

  return replaceRecoveryCodesForUser({
    userId: input.userId,
    count: input.count,
    client,
  });
}

export async function consumeRecoveryCode(input: {
  userId: string;
  code: string;
  client?: RecoveryCodeClient;
}) {
  const client = input.client ?? prisma;
  const normalizedCode = normalizeRecoveryCode(input.code);
  const hashedCandidate = hashRecoveryCode(normalizedCode);
  const legacyHashedCandidate = hashRecoveryCodeLegacy(normalizedCode);
  const availableCodes = await client.recoveryCode.findMany({
    where: {
      userId: input.userId,
      usedAt: null,
    },
    select: {
      id: true,
      codeHash: true,
    },
  });

  const matchingCode = availableCodes.find((entry) => {
    if (safeEqual(entry.codeHash, hashedCandidate)) {
      return true;
    }

    if (entry.codeHash.startsWith(`${LEGACY_RECOVERY_CODE_HASH_PREFIX}$`)) {
      return safeEqual(entry.codeHash, legacyHashedCandidate);
    }

    return false;
  });

  if (!matchingCode) {
    return {
      success: false as const,
    };
  }

  const result = await client.recoveryCode.updateMany({
    where: {
      id: matchingCode.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  return {
    success: result.count === 1,
  } as const;
}

export async function getRecoveryCodeStatus(userId: string, client?: RecoveryCodeClient) {
  const activeClient = client ?? prisma;
  const [remaining, total, latestCode] = await Promise.all([
    activeClient.recoveryCode.count({
      where: {
        userId,
        usedAt: null,
      },
    }),
    activeClient.recoveryCode.count({
      where: {
        userId,
      },
    }),
    activeClient.recoveryCode.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  return {
    totalCodes: total,
    remainingCodes: remaining,
    usedCodes: Math.max(total - remaining, 0),
    lastGeneratedAt: latestCode?.createdAt ?? null,
    hasRecoveryCodes: total > 0,
  };
}
