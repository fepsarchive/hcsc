import { loadEnvConfig } from "@next/env";
import { assertDatabaseIsolation } from "./src/lib/database-isolation";

import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
// Offline generate/validate do not connect; database commands must be checked.
const command = process.argv.find((argument) => ["migrate", "db", "studio"].includes(argument));
if (command) assertDatabaseIsolation(process.env, {
  testData: (command === "migrate" && process.argv.includes("dev")) ||
    (command === "db" && process.argv.some((argument) => ["push", "seed"].includes(argument))) || process.argv.includes("reset"),
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
