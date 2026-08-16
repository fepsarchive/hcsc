import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("production system-owner access never falls back to the seeded address", () => {
  const ownerSource = source("../src/server/auth/system-owner.ts");
  assert.match(ownerSource, /fallbackEnabled = process\.env\.NODE_ENV !== "production"/);
  assert.match(ownerSource, /config\.fallbackEnabled && user\.email/);
});

test("critical data services keep organization scope in read and mutation paths", () => {
  const criticalServices = [
    "../src/server/services/assets/assets-service.ts",
    "../src/server/services/events/events-service.ts",
    "../src/server/services/reports/reports-service.ts",
    "../src/server/services/security-testing/security-test-service.ts",
    "../src/server/integrations/integration-endpoint-service.ts",
  ];

  for (const file of criticalServices) {
    const serviceSource = source(file);
    assert.match(serviceSource, /organizationId/, `${file} must preserve tenant scoping`);
    assert.match(
      serviceSource,
      /where:\s*\{[^}]*organizationId|organizationId:\s*input\.organizationId/,
      `${file} must scope persistence`,
    );
  }
});

test("readiness combines database and production configuration health", () => {
  const readinessRoute = source("../src/app/api/health/ready/route.ts");
  assert.match(readinessRoute, /database\.status === "healthy" && configuration\.ready/);
  assert.match(readinessRoute, /status: ready \? 200 : 503/);
});

test("integration endpoint schema has a deployable migration", () => {
  const migration = source("../prisma/migrations/20260816130000_integration_endpoints/migration.sql");
  assert.match(migration, /CREATE TABLE "IntegrationEndpoint"/);
  assert.match(migration, /IntegrationEndpoint_organizationId_fkey/);
  assert.match(migration, /ON DELETE CASCADE/);
});
