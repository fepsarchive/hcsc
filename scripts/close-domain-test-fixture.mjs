import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import pg from "pg";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
execFileSync(process.execPath, ["--import", "tsx", fileURLToPath(new URL("./check-database-isolation.ts", import.meta.url)), "--test-data"], { stdio: "inherit" });
assert.equal(process.env.HCSC_E2E_ALLOW_DATABASE_WRITES, "true");
const base = process.env.HCSC_E2E_BASE_URL ?? "http://localhost:3001";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const directories = process.argv.slice(2);
assert.ok(directories.length > 0, "Exact test artifact directory required");
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
try {
  await client.connect();
  for (const directory of directories) {
    const path = resolve(directory);
    assert.ok(path.startsWith(`${resolve(tmpdir())}/`) && basename(path).startsWith("hcsc-domain-e2e-"));
    const fixture = JSON.parse(await readFile(join(path, "fixture.json"), "utf8"));
    assert.match(fixture.email, /^e2e-domain-[a-f0-9]+@hcsc\.local$/);
    await client.query("BEGIN");
    const account = await client.query('SELECT id FROM "User" WHERE id = $1 AND email = $2 FOR UPDATE', [fixture.userId, fixture.email]);
    assert.equal(account.rowCount, 1, "Exact test account must exist");
    await client.query('UPDATE "User" SET status = $1, "updatedAt" = NOW() WHERE id = $2 AND email = $3', ["suspended", fixture.userId, fixture.email]);
    await client.query('UPDATE "Session" SET status = $1 WHERE "userId" = $2', ["revoked", fixture.userId]);
    await client.query("COMMIT");
    const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fixture.email, password: fixture.password }) });
    assert.equal(response.status, 401, "Suspended account must not log in with a valid password");
    console.log(JSON.stringify({ account: fixture.email, status: "suspended", sessions: "revoked", suspendedLoginTest: "passed", records: "retained_for_audit" }));
  }
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
