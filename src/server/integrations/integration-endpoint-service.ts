import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { assertSafeOutboundUrl, OutboundPolicyError } from "@/server/integrations/outbound-url-policy";
import { postSafeWebhook } from "@/server/integrations/outbound-transport";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/server/integrations/secret-crypto";

export type OutboundEventType = "security_event" | "security_test_completed" | "report_ready";

function mapEndpoint(endpoint: {
  id: string;
  name: string;
  endpointUrl: string;
  eventTypes: unknown;
  isEnabled: boolean;
  lastDeliveryStatus: string | null;
  lastDeliveryAt: Date | null;
  lastResponseCode: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    // Never spread a database record here: it also contains the signing ciphertext.
    id: endpoint.id,
    name: endpoint.name,
    endpointUrl: endpoint.endpointUrl,
    isEnabled: endpoint.isEnabled,
    lastDeliveryStatus: endpoint.lastDeliveryStatus,
    lastResponseCode: endpoint.lastResponseCode,
    eventTypes: Array.isArray(endpoint.eventTypes) ? endpoint.eventTypes.map(String) : [],
    lastDeliveryAt: endpoint.lastDeliveryAt?.toISOString() ?? null,
    createdAt: endpoint.createdAt.toISOString(),
    updatedAt: endpoint.updatedAt.toISOString(),
  };
}

export async function listIntegrationEndpoints(organizationId: string) {
  const endpoints = await prisma.integrationEndpoint.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  return endpoints.map(mapEndpoint);
}

export async function createIntegrationEndpoint(input: {
  organizationId: string;
  userId: string;
  name: string;
  endpointUrl: string;
  eventTypes: OutboundEventType[];
}) {
  const url = await assertSafeOutboundUrl(input.endpointUrl);
  const signingSecret = `hcsc_whsec_${randomBytes(32).toString("base64url")}`;
  const endpoint = await prisma.integrationEndpoint.create({
    data: {
      organizationId: input.organizationId,
      createdByUserId: input.userId,
      name: input.name,
      endpointUrl: url.toString(),
      signingSecretCiphertext: encryptIntegrationSecret(signingSecret),
      eventTypes: input.eventTypes,
    },
  });
  return { endpoint: mapEndpoint(endpoint), signingSecret };
}

export async function deleteIntegrationEndpoint(organizationId: string, id: string) {
  const endpoint = await prisma.integrationEndpoint.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!endpoint) return false;
  await prisma.integrationEndpoint.delete({ where: { id: endpoint.id } });
  return true;
}

async function deliver(
  endpoint: { id: string; endpointUrl: string; signingSecretCiphertext: string },
  eventType: OutboundEventType,
  data: unknown,
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const deliveryId = randomUUID();

  let statusCode: number | null = null;
  let deliveryStatus = "failed";
  try {
    const body = JSON.stringify({ id: deliveryId, type: eventType, createdAt: new Date().toISOString(), data });
    const secret = decryptIntegrationSecret(endpoint.signingSecretCiphertext);
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const response = await postSafeWebhook(endpoint.endpointUrl, body, {
        "Content-Type": "application/json",
        "User-Agent": "HCSC-Webhook/1.0",
        "X-HCSC-Event": eventType,
        "X-HCSC-Delivery": deliveryId,
        "X-HCSC-Timestamp": timestamp,
        "X-HCSC-Signature": `sha256=${signature}`,
    });
    statusCode = response.status;
    deliveryStatus = response.ok ? "delivered" : "rejected";
  } catch (error) {
    deliveryStatus = error instanceof OutboundPolicyError ? "blocked" : "failed";
  }

  await prisma.integrationEndpoint.update({
    where: { id: endpoint.id },
    data: { lastDeliveryStatus: deliveryStatus, lastDeliveryAt: new Date(), lastResponseCode: statusCode },
  });
  return { success: deliveryStatus === "delivered", status: deliveryStatus, responseCode: statusCode, deliveryId };
}

export async function testIntegrationEndpoint(organizationId: string, id: string) {
  const endpoint = await prisma.integrationEndpoint.findFirst({ where: { id, organizationId, isEnabled: true } });
  if (!endpoint) return null;
  return deliver(endpoint, "security_event", { test: true, message: "HCSC signed connectivity test" });
}

export async function dispatchIntegrationEvent(organizationId: string, eventType: OutboundEventType, data: unknown) {
  const endpoints = await prisma.integrationEndpoint.findMany({ where: { organizationId, isEnabled: true } });
  const selected = endpoints.filter((endpoint) => Array.isArray(endpoint.eventTypes) && endpoint.eventTypes.map(String).includes(eventType));
  const results: PromiseSettledResult<Awaited<ReturnType<typeof deliver>>>[] = [];
  // Bound socket and payload pressure per event dispatch.
  for (let offset = 0; offset < selected.length; offset += 4) {
    results.push(...await Promise.allSettled(selected.slice(offset, offset + 4).map((endpoint) => deliver(endpoint, eventType, data))));
  }
  return results;
}
