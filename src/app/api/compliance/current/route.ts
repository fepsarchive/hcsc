import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { getCurrentCompliance } from "@/server/services/compliance/compliance-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_compliance",
    target: "compliance:current",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const compliance = await getCurrentCompliance(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, compliance);
}
