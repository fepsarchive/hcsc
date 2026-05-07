import type { Prisma } from "@prisma/client";

import { calculateComplianceSnapshot } from "@/lib/compliance-engine";
import { prisma } from "@/server/db/prisma";
import { buildDemoEnvironmentForOrganization, buildEnvironmentWithoutCompliance } from "@/server/services/core/environment-service";

export async function getCurrentComplianceWithEngine(organizationId: string) {
  const latestSnapshot = await prisma.complianceSnapshot.findFirst({
    where: { organizationId },
    include: {
      functions: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (latestSnapshot) {
    return buildDemoEnvironmentForOrganization(organizationId).then((environment) => environment.compliance);
  }

  const base = await buildEnvironmentWithoutCompliance(organizationId);
  return calculateComplianceSnapshot(base);
}

export async function recalculateComplianceWithEngine(input: {
  organizationId: string;
}) {
  const base = await buildEnvironmentWithoutCompliance(input.organizationId);
  const snapshot = calculateComplianceSnapshot(base);

  const created = await prisma.complianceSnapshot.create({
    data: {
      organizationId: input.organizationId,
      overallScore: snapshot.overallScore,
      iso27001Score: snapshot.iso27001Score,
      kvkkScore: snapshot.kvkkScore,
      gdprScore: snapshot.gdprScore,
      indicators: snapshot.indicators as unknown as Prisma.InputJsonValue,
      matrix: snapshot.matrix as unknown as Prisma.InputJsonValue,
    },
  });

  if (snapshot.nist.length) {
    await prisma.complianceFunctionScore.createMany({
      data: snapshot.nist.map((item) => ({
        complianceSnapshotId: created.id,
        name: item.name,
        score: item.score,
        status: item.status,
        controls: item.controls as unknown as Prisma.InputJsonValue,
        gaps: item.gaps as unknown as Prisma.InputJsonValue,
        improvements: item.improvements as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  const environment = await buildDemoEnvironmentForOrganization(input.organizationId);

  return {
    compliance: environment.compliance,
    overallScore: snapshot.overallScore,
  };
}
