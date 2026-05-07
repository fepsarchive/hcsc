import type { IdentityStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapIdentityRecord } from "@/server/services/core/domain-mappers";

export async function listIdentities(organizationId: string) {
  const identities = await prisma.identityProfile.findMany({
    where: { organizationId },
    orderBy: [{ riskScore: "desc" }, { anomalyScore: "desc" }],
  });

  return identities.map(mapIdentityRecord);
}

export async function getIdentity(organizationId: string, identityId: string) {
  const identity = await prisma.identityProfile.findFirst({
    where: {
      id: identityId,
      organizationId,
    },
  });

  return identity ? mapIdentityRecord(identity) : null;
}

export async function updateIdentityStatus(input: {
  organizationId: string;
  identityId: string;
  status: IdentityStatus;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const identity = await prisma.identityProfile.findFirst({
    where: {
      id: input.identityId,
      organizationId: input.organizationId,
    },
  });

  if (!identity) {
    return null;
  }

  const updated = await prisma.identityProfile.update({
    where: { id: identity.id },
    data: {
      status: input.status,
      updatedAt: new Date(),
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "settings_updated",
    module: "Identities",
    target: updated.name,
    severity: input.status === "isolated" ? "high" : "info",
    result: "success",
    details: `${updated.name} için identity status ${input.status} olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  return mapIdentityRecord(updated);
}
