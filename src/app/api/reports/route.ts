import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listReports } from "@/server/services/reports/reports-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "generate_report",
    target: "reports:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const items = await listReports(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, items, { total: items.length });
}
