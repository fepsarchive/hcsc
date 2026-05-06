import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type DatabaseMode = "mock" | "hybrid" | "database";

type GlobalWithPrisma = typeof globalThis & {
  __hcscPrisma?: PrismaClient | null;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

function getDatabaseMode(): DatabaseMode {
  const mode = process.env.HCSC_DATABASE_MODE;

  if (mode === "database" || mode === "hybrid") {
    return mode;
  }

  return "mock";
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const databaseMode = getDatabaseMode();
export const isDatabaseEnabled = databaseMode !== "mock" && Boolean(process.env.DATABASE_URL);

export const db =
  globalForPrisma.__hcscPrisma ??
  (isDatabaseEnabled ? createPrismaClient() : null);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__hcscPrisma = db;
}

export function requireDb() {
  if (!db) {
    throw new Error(
      "Database access requested before Prisma was configured. Set DATABASE_URL and HCSC_DATABASE_MODE=hybrid or database.",
    );
  }

  return db;
}
