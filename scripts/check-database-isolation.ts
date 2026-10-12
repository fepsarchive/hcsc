import { loadEnvConfig } from "@next/env";
import { assertDatabaseIsolation, databaseTargetFingerprint } from "../src/lib/database-isolation";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
try {
  if (process.argv.includes("--fingerprint")) {
    console.log(JSON.stringify({
      runtime: databaseTargetFingerprint(process.env.DATABASE_URL ?? ""),
      direct: process.env.DIRECT_URL ? databaseTargetFingerprint(process.env.DIRECT_URL) : null,
      validated: false,
    }, null, 2));
  } else {
    console.log(JSON.stringify({ ...assertDatabaseIsolation(process.env, { testData: process.argv.includes("--test-data") }), validated: true }, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "DB izolasyon kontrolü başarısız.");
  process.exitCode = 1;
}
