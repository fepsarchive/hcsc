import assert from "node:assert/strict";
import test from "node:test";
import { assertDatabaseIsolation, databaseTargetFingerprint } from "../src/lib/database-isolation";

const prod = "postgresql://user:secret@ep-prod.eu.neon.tech/hcsc?sslmode=require";
const dev = "postgresql://other:secret@ep-dev.eu.neon.tech/hcsc?sslmode=require";
const pin = (url: string) => databaseTargetFingerprint(url).fingerprint;
const env = { DATABASE_URL: dev, HCSC_DATABASE_TARGET_FINGERPRINT: pin(dev), HCSC_PRODUCTION_DATABASE_FINGERPRINT: pin(prod) };

test("DB fingerprint ignores credentials, normalizes Neon pooling and default port", () => {
  assert.equal(pin(prod), pin("postgres://another:password@ep-prod-pooler.eu.neon.tech:5432/hcsc?sslmode=verify-full"));
  assert.notEqual(pin(prod), pin(dev));
  assert.notEqual(pin(prod), pin(prod.replace("/hcsc", "/other")));
  for (const suffix of ["&host=localhost", "&hostaddr=127.0.0.1", "&database=other", "&port=1234", "&options=secret"]) assert.throws(() => pin(prod + suffix));
  assert.throws(() => pin("postgres://localhost"));
});

test("remote targets fail closed without pins; preview cannot use production despite NODE_ENV", () => {
  assert.throws(() => assertDatabaseIsolation({ DATABASE_URL: dev }), /doğrulanmalıdır/);
  assert.equal(assertDatabaseIsolation(env).scope, "development");
  assert.throws(() => assertDatabaseIsolation({ ...env, DATABASE_URL: prod, HCSC_DATABASE_TARGET_FINGERPRINT: pin(prod) }), /canlı DB/);
  assert.throws(() => assertDatabaseIsolation({ ...env, NODE_ENV: "production", VERCEL_ENV: "preview", DATABASE_URL: prod, HCSC_DATABASE_TARGET_FINGERPRINT: pin(prod) }), /canlı DB/);
  assert.equal(assertDatabaseIsolation({ ...env, NODE_ENV: "production", VERCEL_ENV: "preview" }).scope, "preview");
});

test("mismatched runtime/direct URLs, stale pin and production fixtures are refused", () => {
  assert.throws(() => assertDatabaseIsolation({ ...env, DIRECT_URL: prod }), /farklı/);
  assert.throws(() => assertDatabaseIsolation({ ...env, HCSC_DATABASE_TARGET_FINGERPRINT: pin(prod) }), /eşleşmiyor/);
  const production = { ...env, NODE_ENV: "production", DATABASE_URL: prod, HCSC_DATABASE_TARGET_FINGERPRINT: pin(prod) };
  assert.equal(assertDatabaseIsolation(production).scope, "production");
  assert.throws(() => assertDatabaseIsolation(production, { testData: true }), /test\/seed/);
  assert.throws(() => assertDatabaseIsolation({ ...env, NODE_ENV: "production" }), /Üretim DB/);
  assert.equal(assertDatabaseIsolation({ DATABASE_URL: "postgres://dev:dev@127.0.0.1:5432/hcsc_test" }, { testData: true }).local, true);
});
