import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { assertSafeOutboundUrl } from "@/server/integrations/outbound-url-policy";
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
    ...endpoint,
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
  await assertSafeOutboundUrl(endpoint.endpointUrl);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const deliveryId = randomUUID();
  const body = JSON.stringify({ id: deliveryId, type: eventType, createdAt: new Date().toISOString(), data });
  const secret = decryptIntegrationSecret(endpoint.signingSecretCiphertext);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  let statusCode: number | null = null;
  let deliveryStatus = "failed";
  try {
    const response = await fetch(endpoint.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "HCSC-Webhook/1.0",
        "X-HCSC-Event": eventType,
        "X-HCSC-Delivery": deliveryId,
        "X-HCSC-Timestamp": timestamp,
        "X-HCSC-Signature": `sha256=${signature}`,
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });
    statusCode = response.status;
    deliveryStatus = response.ok ? "delivered" : "rejected";
  } catch {
    deliveryStatus = "failed";
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
  return Promise.allSettled(selected.map((endpoint) => deliver(endpoint, eventType, data)));
}
