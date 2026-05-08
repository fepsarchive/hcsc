import type { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { recordReportPrinted } from "@/server/services/reports/reports-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "generate_report",
    target: "report:print",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const printed = await recordReportPrinted({
    organizationId: auth.context.session.organizationId,
    reportId: id,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  if (!printed) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Report bulunamadı.");
  }

  return apiOk(auth.context.requestId, {
    success: true,
    reportId: printed.reportId,
    title: printed.title,
  });
}
