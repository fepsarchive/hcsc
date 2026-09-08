import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { prisma } from "@/server/db/prisma";
import { createAuthAuditLog } from "@/server/auth/session";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  const memberships = await prisma.membership.findMany({ where: { userId: auth.context.session.userId }, select: { role: true, organization: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } });
  return apiOk(auth.context.requestId, { currentOrganizationId: auth.context.session.organizationId, memberships });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  const input = z.object({ organizationId: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return apiError(auth.context.requestId, 400, "INVALID_WORKSPACE", "Çalışma alanı gerekli.");
  const { session } = auth.context;
  const membership = await prisma.membership.findFirst({ where: { userId: session.userId, organizationId: input.data.organizationId } });
  if (!membership) return apiError(auth.context.requestId, 403, "WORKSPACE_FORBIDDEN", "Bu çalışma alanına üyeliğin yok.");
  await prisma.session.update({ where: { id: session.id }, data: { organizationId: membership.organizationId } });
  await createAuthAuditLog({ organizationId: membership.organizationId, userId: session.userId, actorName: session.user.name, actorRole: membership.role, action: "workspace_switched", target: membership.organizationId, severity: "info", result: "success", details: "Aktif çalışma alanı değiştirildi.", ipAddress: auth.context.ipAddress, device: auth.context.userAgent });
  return apiOk(auth.context.requestId, { organizationId: membership.organizationId });
}
