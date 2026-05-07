import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { evaluateAccessRequest } from "@/server/services/access-requests/access-requests-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "evaluate_access",
    target: "access-requests:evaluate",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const evaluated = await evaluateAccessRequest({
    organizationId: auth.context.session.organizationId,
    requestId: id,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  if (!evaluated) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Access request bulunamadı.");
  }

  return apiOk(auth.context.requestId, evaluated);
}
