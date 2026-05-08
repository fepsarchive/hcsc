import type { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { getReportPrintPayload } from "@/server/services/reports/reports-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "generate_report",
    target: "report:print-payload",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const payload = await getReportPrintPayload(auth.context.session.organizationId, id);

  if (!payload) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Report print payload bulunamadı.");
  }

  return apiOk(auth.context.requestId, payload);
}
