import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { mapReportRecord } from "@/server/services/core/domain-mappers";
import { generateReportWithEngine, getPersistedReportWithLinks } from "@/server/services/engines/report-engine.service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

export async function listReports(organizationId: string) {
  const reports = await prisma.report.findMany({
    where: { organizationId },
    include: {
      eventLinks: true,
      assetLinks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return reports.map((report) => ({
    ...mapReportRecord(report),
    relatedEventIds: report.eventLinks.map((entry) => entry.eventId),
    relatedAssetIds: report.assetLinks.map((entry) => entry.assetId),
  }));
}

export async function getReport(organizationId: string, reportId: string) {
  return getPersistedReportWithLinks(organizationId, reportId);
}

export async function generateOrganizationReport(input: {
  organizationId: string;
  type?: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const report = await generateReportWithEngine({
    organizationId: input.organizationId,
    type: input.type,
    generatedBy: input.actor.name,
  });

  if (!report) {
    return null;
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "report_generated",
    module: "Reports",
    target: report.title,
    severity: "info",
    result: "success",
    details: `${report.title} raporu üretildi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Report generated",
    description: `${report.title} raporu hazır.`,
    type: "report_ready",
    severity: "low",
    module: "Reports",
    actionHref: "/reports",
    roles: ["security_admin", "cloud_security_analyst", "compliance_officer", "executive"],
  });

  return report;
}
