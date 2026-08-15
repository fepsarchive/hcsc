import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { deleteIntegrationEndpoint } from "@/server/integrations/integration-endpoint-service";

export async function DELETE(request: NextRequest, context: RouteContext<"/api/integrations/endpoints/[id]">) {
  const auth = await requireApiAuth(request, { permission: "manage_settings", target: "integration-endpoints:delete" });
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const deleted = await deleteIntegrationEndpoint(auth.context.session.organizationId, id);
  return deleted ? apiOk(auth.context.requestId, { deleted: true }) : apiError(auth.context.requestId, 404, "ENDPOINT_NOT_FOUND", "Endpoint bulunamadı.");
}
