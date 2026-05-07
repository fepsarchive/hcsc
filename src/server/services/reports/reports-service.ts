import type { Prisma, ReportType } from "@prisma/client";

import { calculateComplianceSnapshot } from "@/lib/compliance-engine";
import { generateReport } from "@/lib/report-engine";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { buildDemoEnvironmentForOrganization, buildEnvironmentWithoutCompliance } from "@/server/services/core/environment-service";
import { mapReportRecord } from "@/server/services/core/domain-mappers";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

function normalizeReportType(type: string | undefined): ReportType {
  switch (type) {
    case "critical-data":
    case "critical_data":
      return "critical_data";
    case "zero-trust":
    case "zero_trust":
      return "zero_trust";
    case "deception":
    case "nist":
    case "privacy":
    case "demo":
      return type;
    default:
      return "general";
  }
}

function toClientReportType(type: ReportType) {
  switch (type) {
    case "critical_data":
      return "critical-data";
    case "zero_trust":
      return "zero-trust";
    default:
      return type;
  }
}

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
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      organizationId,
    },
    include: {
      eventLinks: true,
      assetLinks: true,
    },
  });

  if (!report) {
    return null;
  }

  return {
    ...mapReportRecord(report),
    relatedEventIds: report.eventLinks.map((entry) => entry.eventId),
    relatedAssetIds: report.assetLinks.map((entry) => entry.assetId),
  };
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
  const environment = await buildDemoEnvironmentForOrganization(input.organizationId);
  const dbType = normalizeReportType(input.type);
  const generated = generateReport(toClientReportType(dbType), environment);

  const created = await prisma.report.create({
    data: {
      organizationId: input.organizationId,
      title: generated.title,
      type: dbType,
      status: generated.status ?? "generated",
      summary: generated.summary,
      findings: generated.findings,
      risks: generated.risks,
      recommendedActions: generated.recommendedActions,
      relatedControls: generated.relatedControls,
      markdownContent: generated.markdownContent,
      snapshotJson: generated as unknown as Prisma.InputJsonValue,
      generatedBy: input.actor.name,
    },
  });

  if (generated.relatedEventIds.length) {
    await prisma.reportEventLink.createMany({
      data: generated.relatedEventIds.map((eventId) => ({
        reportId: created.id,
        eventId,
      })),
      skipDuplicates: true,
    });
  }

  if (generated.relatedAssetIds?.length) {
    await prisma.reportAssetLink.createMany({
      data: generated.relatedAssetIds.map((assetId) => ({
        reportId: created.id,
        assetId,
      })),
      skipDuplicates: true,
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "report_generated",
    module: "Reports",
    target: created.title,
    severity: "info",
    result: "success",
    details: `${created.title} raporu üretildi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Report generated",
    description: `${created.title} raporu hazır.`,
    type: "report_ready",
    severity: "low",
    module: "Reports",
    actionHref: "/reports",
    roles: ["security_admin", "cloud_security_analyst", "compliance_officer", "executive"],
  });

  return getReport(input.organizationId, created.id);
}

export async function recalculateAndPersistCompliance(input: {
  organizationId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
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

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "compliance_recalculated",
    module: "Compliance",
    target: "latest-compliance-snapshot",
    severity: "info",
    result: "success",
    details: `Uyumluluk snapshot skoru ${snapshot.overallScore}% olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Compliance recalculated",
    description: `Uyumluluk snapshot skoru ${snapshot.overallScore}% olarak güncellendi.`,
    type: "compliance_changed",
    severity: "medium",
    module: "Compliance",
    actionHref: "/compliance",
    roles: ["security_admin", "cloud_security_analyst", "compliance_officer"],
  });

  return buildDemoEnvironmentForOrganization(input.organizationId).then((environment) => environment.compliance);
}
