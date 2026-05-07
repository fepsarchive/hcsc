import { createMockEnvironment } from "@/lib/mock-data";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapSimulationRunRecord } from "@/server/services/core/domain-mappers";
import { generateOrganizationReport } from "@/server/services/reports/reports-service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

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

  const report = await generateOrganizationReport({
    organizationId: input.organizationId,
    type: "demo",
    actor: input.actor,
  });

  const run = await prisma.simulationRun.create({
    data: {
      organizationId: input.organizationId,
      scenarioId: "executive-demo",
      summary: "Executive demo DB-backed akış üzerinden tamamlandı.",
      generatedEventIds: [],
      generatedReportIds: report ? [report.id] : [],
      affectedModules: ["Dashboard", "Reports", "Events", "Compliance"],
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
    description: "Executive demo senaryosu tamamlandı.",
    type: "simulation_completed",
    severity: "low",
    module: "Simulations",
    actionHref: "/simulations",
    roles: ["security_admin", "cloud_security_analyst", "executive"],
  });

  return {
    run: mapSimulationRunRecord(run),
    report,
  };
}
