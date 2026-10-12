import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { PrismaClient } from "@prisma/client";

test("endpoint API projection never returns encrypted credentials or future private fields", async () => {
  const date = new Date("2026-10-09T00:00:00Z");
  const fixture = {
    id: "endpoint-fixture", name: "Fixture", endpointUrl: "https://example.com/hook",
    eventTypes: ["security_event"], isEnabled: true,
    lastDeliveryStatus: null, lastDeliveryAt: null, lastResponseCode: null,
    createdAt: date, updatedAt: date,
    signingSecretCiphertext: "encrypted-test-value", organizationId: "org-fixture",
    createdByUserId: "user-fixture", futurePrivateField: "must-not-leak",
  };
  const find = mock.fn(async (input: unknown) => { assert.ok(input); return [fixture]; });
  const globalDb = globalThis as typeof globalThis & { prisma?: PrismaClient };
  const previousClient = globalDb.prisma;
  globalDb.prisma = { integrationEndpoint: { findMany: find } } as unknown as PrismaClient;
  try {
    const { listIntegrationEndpoints } = await import("../../src/server/integrations/integration-endpoint-service");
    const endpoints = await listIntegrationEndpoints("org-fixture");
    assert.deepEqual(Object.keys(endpoints[0]).sort(), [
      "id", "name", "endpointUrl", "eventTypes", "isEnabled", "lastDeliveryStatus",
      "lastDeliveryAt", "lastResponseCode", "createdAt", "updatedAt",
    ].sort());
    assert.equal(endpoints[0].createdAt, date.toISOString());
    assert.deepEqual(find.mock.calls[0].arguments[0], {
      where: { organizationId: "org-fixture" }, orderBy: { createdAt: "desc" },
    });
  } finally {
    globalDb.prisma = previousClient;
  }
});
