import { calculateComplianceSnapshot } from "@/lib/compliance-engine";
import { createMockEnvironment } from "@/lib/mock-data";
import { prisma } from "@/server/db/prisma";
import {
  mapAccessRequestRecord,
  mapAssetRecord,
  mapComplianceSnapshotRecord,
  mapDeceptionAssetRecord,
  mapIdentityRecord,
  mapReportRecord,
  mapSecurityEventRecord,
  mapSimulationRunRecord,
} from "@/server/services/core/domain-mappers";
import type { DemoEnvironment } from "@/types";

function foundationEnvironment() {
  return createMockEnvironment();
}

export async function buildEnvironmentWithoutCompliance(organizationId: string) {
  const [assets, identities, accessRequests, events, deceptions, reports, runs] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId },
      orderBy: { riskScore: "desc" },
    }),
    prisma.identityProfile.findMany({
      where: { organizationId },
      orderBy: [{ riskScore: "desc" }, { anomalyScore: "desc" }],
    }),
    prisma.accessRequest.findMany({
      where: { organizationId },
      include: {
        identityProfile: true,
        asset: true,
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.securityEvent.findMany({
      where: { organizationId },
      include: {
        timelineEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deceptionAsset.findMany({
      where: { organizationId },
      orderBy: [{ triggerCount: "desc" }, { lureScore: "desc" }],
    }),
    prisma.report.findMany({
      where: { organizationId },
      include: {
        eventLinks: true,
        assetLinks: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.simulationRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const foundation = foundationEnvironment();

  const mappedReports = reports.map((report) => ({
    ...mapReportRecord(report),
    relatedEventIds: report.eventLinks.map((entry) => entry.eventId),
    relatedAssetIds: report.assetLinks.map((entry) => entry.assetId),
  }));

  return {
    assets: assets.map(mapAssetRecord),
    identities: identities.map(mapIdentityRecord),
    accessRequests: accessRequests.map(mapAccessRequestRecord),
    policyRules: foundation.policyRules,
    events: events.map(mapSecurityEventRecord),
    deceptions: deceptions.map(mapDeceptionAssetRecord),
    threats: foundation.threats,
    controls: foundation.controls,
    threatMatrix: foundation.threatMatrix,
    simulations: foundation.simulations,
    layers: foundation.layers,
    runs: runs.map(mapSimulationRunRecord),
    reports: mappedReports,
    demoScenario: foundation.demoScenario,
    cloudNodes: foundation.cloudNodes,
    cloudLinks: foundation.cloudLinks,
  } satisfies Omit<DemoEnvironment, "compliance">;
}

export async function buildDemoEnvironmentForOrganization(organizationId: string): Promise<DemoEnvironment> {
  const base = await buildEnvironmentWithoutCompliance(organizationId);
  const latestSnapshot = await prisma.complianceSnapshot.findFirst({
    where: { organizationId },
    include: {
      functions: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const compliance = latestSnapshot
    ? mapComplianceSnapshotRecord(latestSnapshot, latestSnapshot.functions)
    : calculateComplianceSnapshot(base);

  return {
    ...base,
    compliance,
  };
}
