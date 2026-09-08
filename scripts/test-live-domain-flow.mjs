// Explicitly creates an isolated test account/workspace in the configured local app's DB.
// Credentials remain private in a temporary browser-state artifact, never in console output.
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.env.HCSC_E2E_BASE_URL ?? "http://localhost:3001";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Only local servers are allowed");
assert.equal(process.env.HCSC_E2E_ALLOW_DATABASE_WRITES, "true", "Explicit test database write opt-in required");
let cookie = "";
async function call(path, body, expected = 200, authenticated = true) {
  const response = await fetch(`${base}${path}`, { method: body ? "POST" : "GET", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(authenticated && cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  assert.equal(response.status, expected, `${path}: ${payload.error?.code ?? response.status}`);
  const sessionCookie = response.headers.getSetCookie().find((value) => value.startsWith("hcsc_session="));
  if (sessionCookie) cookie = sessionCookie.split(";")[0];
  return payload.data;
}
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret].map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  return ((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
const suffix = randomBytes(5).toString("hex");
const email = `e2e-domain-${suffix}@hcsc.local`;
const password = randomBytes(24).toString("base64url");
await call("/api/domains", undefined, 401, false);
const account = await call("/api/auth/register", { fullName: "HCSC Isolated E2E", companyName: `E2E Domain ${suffix}`, email, password }, 201);
assert.equal(account.twoFactorVerified, false);
await call("/api/domains", undefined, 403);
const setup = await call("/api/auth/2fa/setup");
const confirmation = await call("/api/auth/2fa/confirm", { code: totp(setup.manualSecret) });
assert.equal(confirmation.twoFactorVerified, true);
await call("/api/auth/onboarding", { organizationName: `E2E Domain ${suffix}`, cloudMode: "hybrid_cloud", complianceFrameworks: ["NIST CSF"], seedStarterData: false, runInitialScan: false });
assert.deepEqual(await call("/api/domains"), []);
const domain = await call("/api/domains", { hostname: "mertcanyildirim.com" }, 201);
assert.equal(domain.status, "pending_verification");
assert.ok(!("tokenCiphertext" in domain));
await call("/api/domains", { hostname: "https://127.0.0.1" }, 400);
const activation = await call(`/api/domains/${domain.id}`, { action: "activate" });
assert.equal(activation.activationBlocked, true);
assert.equal(activation.activatedAt, null);
await call("/api/domains/nonexistent-id", { action: "check" }, 400);
await call("/api/auth/workspaces", { organizationId: "nonmember-organization" }, 403);
const directory = await mkdtemp(join(tmpdir(), "hcsc-domain-e2e-"));
await writeFile(join(directory, "browser-state.json"), JSON.stringify({ cookies: [{ name: "hcsc_session", value: cookie.split("=")[1], domain: new URL(base).hostname, path: "/", httpOnly: true, secure: false, sameSite: "Lax", expires: -1 }], origins: [] }), { mode: 0o600 });
await writeFile(join(directory, "fixture.json"), JSON.stringify({ email, password, userId: account.user.id, organizationId: account.organization.id, domainId: domain.id }), { mode: 0o600 });
console.log(JSON.stringify({ status: "passed", checks: ["anonymous_rejected", "2fa_required", "real_totp_enrollment", "onboarding", "domain_persisted", "url_rejected", "unverified_activation_blocked", "unknown_domain_rejected", "nonmember_workspace_rejected"], testAccount: email, artifacts: directory }));
