import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiCreated, apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { createIntegrationEndpoint, listIntegrationEndpoints } from "@/server/integrations/integration-endpoint-service";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  endpointUrl: z.url().max(500),
  eventTypes: z.array(z.enum(["security_event", "security_test_completed", "report_ready"])).min(1).max(3),
});

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, { permission: "view_dashboard", target: "integration-endpoints:list" });
  if (!auth.ok) return auth.response;
  return apiOk(auth.context.requestId, await listIntegrationEndpoints(auth.context.session.organizationId));
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, { permission: "manage_settings", target: "integration-endpoints:create" });
  if (!auth.ok) return auth.response;
  const parsed = await parseRequestJson(request, createSchema, auth.context.requestId);
  if (!parsed.success) return parsed.response;
  try {
    return apiCreated(auth.context.requestId, await createIntegrationEndpoint({ organizationId: auth.context.session.organizationId, userId: auth.context.session.userId, ...parsed.data }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Endpoint oluşturulamadı.";
    const conflict = message.includes("Unique constraint");
    return apiError(auth.context.requestId, conflict ? 409 : 400, conflict ? "ENDPOINT_EXISTS" : "ENDPOINT_REJECTED", message);
  }
}
