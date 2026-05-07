import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";
import { mapAuditLogRecord } from "@/server/services/core/domain-mappers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "view_audit_logs",
    target: "audit-log:detail",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const log = await prisma.auditLog.findFirst({
    where: {
      id,
      organizationId: auth.context.session.organizationId,
    },
  });

  if (!log) {
    return apiError(auth.context.requestId, 404, "NOT_FOUND", "Audit log bulunamadı.");
  }

  return apiOk(auth.context.requestId, mapAuditLogRecord(log));
}
