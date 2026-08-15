import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { testIntegrationEndpoint } from "@/server/integrations/integration-endpoint-service";

export async function POST(request: NextRequest, context: RouteContext<"/api/integrations/endpoints/[id]/test">) {
  const auth = await requireApiAuth(request, { permission: "manage_settings", target: "integration-endpoints:test" });
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const result = await testIntegrationEndpoint(auth.context.session.organizationId, id);
  if (!result) return apiError(auth.context.requestId, 404, "ENDPOINT_NOT_FOUND", "Endpoint bulunamadı.");
  return apiOk(auth.context.requestId, result, undefined, result.success ? 200 : 502);
}
