import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { assertDatabaseIsolation } from "@/lib/database-isolation";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Prisma client cannot be created.");
  }

  assertDatabaseIsolation(process.env);
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Revalidate real clients retained across Next dev hot reloads too. Structural
// in-memory test doubles do not open connections and are not Prisma instances.
if (globalForPrisma.prisma instanceof PrismaClient) assertDatabaseIsolation(process.env);
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
