import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { runExecutiveDemo } from "@/server/services/simulations/simulations-service";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "run_simulation",
    target: "simulations:executive-demo",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const result = await runExecutiveDemo({
    organizationId: auth.context.session.organizationId,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  if (!result) return apiError(auth.context.requestId, 409, "SIMULATION_DATA_REQUIRED", "Bu senaryo için örnek varlıklar eksik; gerçek siteyi bağlamak için Domain Bağlantıları alanını kullan.");

  return apiOk(auth.context.requestId, result);
}
