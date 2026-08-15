import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { getSecurityTestOverview } from "@/server/services/security-testing/security-test-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_security_tests",
    target: "adversary-validation:overview",
  });

  if (!auth.ok) return auth.response;

  const overview = await getSecurityTestOverview(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, overview);
}
