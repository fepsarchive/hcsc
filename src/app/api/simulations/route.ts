import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listSimulations } from "@/server/services/simulations/simulations-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "run_simulation",
    target: "simulations:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const result = await listSimulations(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, result, { total: result.simulations.length });
}
