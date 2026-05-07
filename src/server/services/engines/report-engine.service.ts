import type { Prisma, ReportType as DbReportType } from "@prisma/client";

import { generateReport } from "@/lib/report-engine";
import { prisma } from "@/server/db/prisma";
import { buildDemoEnvironmentForOrganization } from "@/server/services/core/environment-service";
import { mapReportRecord } from "@/server/services/core/domain-mappers";

type RequestedReportType =
  | "general"
  | "critical-data"
  | "critical_data"
  | "zero-trust"
  | "zero_trust"
  | "deception"
  | "nist"
  | "privacy"
  | "demo"
  | "executive_demo"
  | "deception_incident"
  | "zero_trust_decision"
  | "compliance_summary"
  | "security_posture"
  | "incident_response";

function normalizeReportType(type: string | undefined): DbReportType {
  switch (type as RequestedReportType | undefined) {
    case "critical-data":
    case "critical_data":
      return "critical_data";
    case "zero-trust":
    case "zero_trust":
    case "zero_trust_decision":
      return "zero_trust";
    case "deception":
    case "deception_incident":
      return "deception";
    case "compliance_summary":
      return "nist";
    case "executive_demo":
      return "demo";
    case "security_posture":
    case "incident_response":
      return "general";
    case "nist":
      return "nist";
    case "privacy":
      return "privacy";
    case "demo":
      return "demo";
    default:
      return "general";
  }
}

function toClientReportType(type: DbReportType) {
  switch (type) {
    case "critical_data":
      return "critical-data" as const;
    case "zero_trust":
      return "zero-trust" as const;
    default:
      return type;
  }
}

export async function getPersistedReportWithLinks(organizationId: string, reportId: string) {
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

export async function generateReportWithEngine(input: {
  organizationId: string;
  type?: string;
  generatedBy: string;
}) {
  const environment = await buildDemoEnvironmentForOrganization(input.organizationId);
  const dbType = normalizeReportType(input.type);
  const generated = generateReport(toClientReportType(dbType), environment);
  const snapshotJson = JSON.parse(
    JSON.stringify({
      ...generated,
      organizationId: input.organizationId,
      generatedBy: input.generatedBy,
      generatedAt: new Date().toISOString(),
      securityScore: environment.compliance.overallScore,
      criticalEvents: environment.events.filter((event) => event.severity === "critical" && event.status !== "resolved").length,
      affectedAssets: generated.relatedAssetIds ?? [],
      accessDecisions: environment.accessRequests
        .filter((request) => ["approved", "rejected", "step_up", "isolated"].includes(request.status))
        .slice(0, 12),
      deceptionTriggers: environment.deceptions
        .filter((deception) => deception.triggerCount > 0)
        .slice(0, 12),
      complianceScores: {
        overall: environment.compliance.overallScore,
        iso27001: environment.compliance.iso27001Score,
        kvkk: environment.compliance.kvkkScore,
        gdpr: environment.compliance.gdprScore,
      },
      recommendations: generated.recommendedActions,
      nistCsfMapping: environment.compliance.nist,
      privacyImpact: {
        kvkkScore: environment.compliance.kvkkScore,
        gdprScore: environment.compliance.gdprScore,
      },
    }),
  ) as Prisma.InputJsonValue;

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
      snapshotJson,
      generatedBy: input.generatedBy,
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

  return getPersistedReportWithLinks(input.organizationId, created.id);
}
