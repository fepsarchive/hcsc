import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listIdentities } from "@/server/services/identities/identities-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "evaluate_access",
    target: "identities:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const items = await listIdentities(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, items, { total: items.length });
}
