import type { AuditResult, AuditSeverity, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

export async function createAuditLog(input: {
  organizationId: string;
  userId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  module: string;
  target: string;
  severity: AuditSeverity;
  result: AuditResult;
  details: string;
  ipAddress?: string | null;
  device?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: input.action,
      module: input.module,
      target: input.target,
      severity: input.severity,
      result: input.result,
      details: input.details,
      ipAddress: input.ipAddress ?? null,
      device: input.device ?? null,
      metadata: input.metadata,
    },
  });
}
