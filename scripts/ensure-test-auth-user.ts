import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { DEFAULT_TEST_AUTH_BYPASS_EMAIL } from "../src/lib/test-auth-policy";
import { hashPassword } from "../src/server/auth/password";

const databaseUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DIRECT_URL is required.");
}

if (process.env.NODE_ENV === "production") {
  throw new Error("The development/test auth account cannot be provisioned in production mode.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const organization = process.env.HCSC_TEST_AUTH_ORGANIZATION_ID?.trim()
    ? await prisma.organization.findUnique({
        where: { id: process.env.HCSC_TEST_AUTH_ORGANIZATION_ID.trim() },
      })
    : await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });

  if (!organization) {
    throw new Error("A workspace must exist before provisioning the test auth account.");
  }

  const email = (process.env.HCSC_TEST_AUTH_BYPASS_EMAIL?.trim() || DEFAULT_TEST_AUTH_BYPASS_EMAIL).toLowerCase();
  const password = process.env.HCSC_TEST_AUTH_PASSWORD?.trim() || "demo123";
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "HCSC UI Test",
      passwordHash: hashPassword(password),
      role: "cloud_security_analyst",
      platformRole: "USER",
      department: "Quality Assurance",
      avatarInitials: "UT",
      status: "active",
      mfaEnabled: false,
    },
    create: {
      id: "user_ui_test",
      name: "HCSC UI Test",
      email,
      passwordHash: hashPassword(password),
      role: "cloud_security_analyst",
      platformRole: "USER",
      department: "Quality Assurance",
      avatarInitials: "UT",
      status: "active",
      mfaEnabled: false,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: { role: "cloud_security_analyst" },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: "cloud_security_analyst",
    },
  });

  console.log(`READY ${email} workspace=${organization.id} role=cloud_security_analyst`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Test auth account provisioning failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
