import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";
import { mapAuditLogRecord } from "@/server/services/core/domain-mappers";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "view_audit_logs",
    target: "audit-logs:list",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const moduleName = request.nextUrl.searchParams.get("module") ?? undefined;
  const severity = request.nextUrl.searchParams.get("severity") ?? undefined;
  const actorId = request.nextUrl.searchParams.get("actorId") ?? undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: auth.context.session.organizationId,
      ...(moduleName ? { module: moduleName } : {}),
      ...(severity ? { severity: severity as never } : {}),
      ...(actorId ? { userId: actorId } : {}),
      ...(search
        ? {
            OR: [
              { actorName: { contains: search, mode: "insensitive" } },
              { target: { contains: search, mode: "insensitive" } },
              { details: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return apiOk(auth.context.requestId, logs.map(mapAuditLogRecord), { total: logs.length });
}
