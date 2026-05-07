import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { recalculateAndPersistCompliance } from "@/server/services/compliance/compliance-service";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_compliance",
    target: "compliance:recalculate",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const compliance = await recalculateAndPersistCompliance({
    organizationId: auth.context.session.organizationId,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  return apiOk(auth.context.requestId, compliance);
}
