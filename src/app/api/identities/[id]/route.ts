import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { getIdentity } from "@/server/services/identities/identities-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "evaluate_access",
    target: "identity:detail",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const identity = await getIdentity(auth.context.session.organizationId, id);

  if (!identity) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Identity bulunamadı.");
  }

  return apiOk(auth.context.requestId, identity);
}
