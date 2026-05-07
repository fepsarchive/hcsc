import { createMockEnvironment } from "@/lib/mock-data";
import { prisma } from "@/server/db/prisma";
import { createAccessRequest, evaluateAccessRequest } from "@/server/services/access-requests/access-requests-service";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { recalculateAndPersistCompliance } from "@/server/services/compliance/compliance-service";
import { mapSimulationRunRecord } from "@/server/services/core/domain-mappers";
import { simulateDeceptionAccess } from "@/server/services/deception/deception-service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";
import { generateOrganizationReport } from "@/server/services/reports/reports-service";

export async function listSimulations(organizationId: string) {
  const foundation = createMockEnvironment();
  const runs = await prisma.simulationRun.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return {
    simulations: foundation.simulations,
    runs: runs.map(mapSimulationRunRecord),
  };
}

export async function runExecutiveDemo(input: {
  organizationId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "simulation_started",
    module: "Simulations",
    target: "executive-demo",
    severity: "info",
    result: "success",
    details: "Executive demo çalıştırıldı.",
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  const criticalAsset =
    (await prisma.asset.findFirst({
      where: {
        organizationId: input.organizationId,
        isDeception: false,
      },
      orderBy: [{ riskScore: "desc" }, { createdAt: "asc" }],
    })) ??
    (await prisma.asset.findFirst({
      where: {
        organizationId: input.organizationId,
        isDeception: false,
      },
    }));

  const identity =
    (await prisma.identityProfile.findFirst({
      where: {
        organizationId: input.organizationId,
        OR: [{ mfaEnabled: false }, { status: { in: ["watchlist", "suspicious"] } }],
      },
      orderBy: [{ anomalyScore: "desc" }, { riskScore: "desc" }],
    })) ??
    (await prisma.identityProfile.findFirst({
      where: { organizationId: input.organizationId },
      orderBy: [{ anomalyScore: "desc" }, { riskScore: "desc" }],
    }));

  const deceptionAsset =
    (await prisma.deceptionAsset.findFirst({
      where: {
        organizationId: input.organizationId,
        name: "legacy-customer-db-shadow",
      },
    })) ??
    (await prisma.deceptionAsset.findFirst({
      where: {
        organizationId: input.organizationId,
        fakeType: "database",
      },
      orderBy: [{ triggerCount: "desc" }, { lureScore: "desc" }],
    }));

  if (!criticalAsset || !identity || !deceptionAsset) {
    return null;
  }

  const accessRequest = await createAccessRequest({
    organizationId: input.organizationId,
    identityProfileId: identity.id,
    assetId: criticalAsset.id,
    requestedAction: criticalAsset.classification === "critical" ? "export" : "read",
    justification: "Executive demo scenario orchestration",
    sourceLocation: identity.homeLocation,
    sourceRegion: identity.region,
    deviceTrust: identity.deviceTrust,
    mfa: identity.mfaEnabled,
    anomalyScore: Math.max(identity.anomalyScore, 72),
    locationRisk: identity.homeLocation === "public_cloud" ? "high" : "medium",
    timeRisk: identity.mfaEnabled ? "elevated" : "off_hours",
    actor: input.actor,
  });

  const evaluatedRequest = accessRequest
    ? await evaluateAccessRequest({
        organizationId: input.organizationId,
        requestId: accessRequest.id,
        actor: input.actor,
      })
    : null;

  const decisionEvent = accessRequest
    ? await prisma.securityEvent.findFirst({
        where: {
          organizationId: input.organizationId,
          relatedAccessRequestId: accessRequest.id,
        },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const deceptionResult = await simulateDeceptionAccess({
    organizationId: input.organizationId,
    deceptionAssetId: deceptionAsset.id,
    identityProfileId: identity.id,
    actor: input.actor,
  });

  const compliance = await recalculateAndPersistCompliance({
    organizationId: input.organizationId,
    actor: input.actor,
  });

  const report = await generateOrganizationReport({
    organizationId: input.organizationId,
    type: "executive_demo",
    actor: input.actor,
  });

  const generatedEventIds = [
    ...(decisionEvent?.id ? [decisionEvent.id] : []),
    ...(deceptionResult?.event?.id ? [deceptionResult.event.id] : []),
  ];

  const run = await prisma.simulationRun.create({
    data: {
      organizationId: input.organizationId,
      scenarioId: "executive-demo",
      summary: `Executive demo DB-backed akış üzerinden tamamlandı. Karar: ${evaluatedRequest?.evaluation.decision ?? "n/a"}, compliance: ${compliance.overallScore}%.`,
      generatedEventIds,
      generatedReportIds: report ? [report.id] : [],
      affectedModules: ["Dashboard", "Access Requests", "Events", "Deception", "Compliance", "Reports"],
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "simulation_completed",
    module: "Simulations",
    target: "executive-demo",
    severity: "info",
    result: "success",
    details: "Executive demo tamamlandı.",
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Executive demo completed",
    description: "Executive demo senaryosu backend engine akışı üzerinden tamamlandı.",
    type: "simulation_completed",
    severity: "low",
    module: "Simulations",
    actionHref: "/simulations",
    roles: ["security_admin", "cloud_security_analyst", "executive"],
  });

  return {
    run: mapSimulationRunRecord(run),
    summary: {
      assetId: criticalAsset.id,
      assetName: criticalAsset.name,
      identityId: identity.id,
      identityName: identity.name,
      accessRequestId: accessRequest?.id ?? null,
      accessDecision: evaluatedRequest?.evaluation.decision ?? null,
      deceptionEventId: deceptionResult?.event?.id ?? null,
      complianceScore: compliance.overallScore,
      reportId: report?.id ?? null,
    },
    accessRequest,
    evaluatedRequest,
    deception: deceptionResult,
    compliance,
    report,
  };
}
