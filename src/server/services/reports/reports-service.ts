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

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];
}

function normalizeConfidentialityLabel(value: string | null | undefined) {
  if (!value || value === "Internal / Thesis Prototype") {
    return "Internal / Confidential";
  }

  return value;
}

function inferRiskLevel(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("critical") || normalized.includes("kritik")) return "critical";
  if (normalized.includes("high") || normalized.includes("yüksek")) return "high";
  if (normalized.includes("medium") || normalized.includes("orta")) return "medium";
  return "low";
}

export async function getReportPrintPayload(organizationId: string, reportId: string) {
  const [organization, branding, report, latestCompliance] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
    }),
    prisma.reportBranding.findUnique({
      where: { organizationId },
    }),
    prisma.report.findFirst({
      where: {
        id: reportId,
        organizationId,
      },
      include: {
        assetLinks: {
          include: {
            asset: true,
          },
        },
        eventLinks: {
          include: {
            event: {
              include: {
                timelineEntries: {
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
        },
      },
    }),
    prisma.complianceSnapshot.findFirst({
      where: { organizationId },
      include: {
        functions: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!organization || !report) {
    return null;
  }

  const snapshot = asRecord(report.snapshotJson);
  const privacyImpact = asRecord(snapshot.privacyImpact);
  const nistMappingFromSnapshot = asRecordArray(snapshot.nistCsfMapping);
  const preparedBy = report.generatedBy ?? branding?.preparedByLabel ?? "HCSC System";
  const affectedAssets = report.assetLinks.map((entry) => ({
    id: entry.asset.id,
    name: entry.asset.name,
    classification: entry.asset.classification,
    riskLevel: entry.asset.riskLevel,
    owner: entry.asset.owner,
    location: entry.asset.location,
  }));
  const eventTimeline = report.eventLinks.map((entry) => ({
    id: entry.event.id,
    title: entry.event.title,
    severity: entry.event.severity,
    status: entry.event.status,
    timestamp: entry.event.createdAt.toISOString(),
    description: entry.event.description,
    entries: entry.event.timelineEntries.map((timelineEntry) => ({
      actor: timelineEntry.actor,
      message: timelineEntry.message,
      timestamp: timelineEntry.createdAt.toISOString(),
    })),
  }));

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      plan: organization.plan,
      region: organization.region,
      cloudMode: organization.cloudMode,
      complianceFrameworks: Array.isArray(organization.complianceFrameworks)
        ? organization.complianceFrameworks.map((entry) => String(entry))
        : [],
    },
    report: {
      id: report.id,
      title: report.title,
      type: report.type,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      generatedBy: report.generatedBy,
      summary: report.summary,
      findings: asStringArray(report.findings),
      risks: asStringArray(report.risks),
      recommendedActions: asStringArray(report.recommendedActions),
      relatedControls: asStringArray(report.relatedControls),
      markdownContent: report.markdownContent,
    },
    branding: {
      companyName: branding?.companyName ?? organization.name,
      reportFooter: branding?.reportFooter ?? "Generated by Hybrid Cloud Security Console",
      preparedByLabel: branding?.preparedByLabel ?? "Prepared by HCSC",
      confidentialityLabel: normalizeConfidentialityLabel(branding?.confidentialityLabel),
    },
    generatedAt: report.createdAt.toISOString(),
    preparedBy,
    confidentialityLabel: normalizeConfidentialityLabel(branding?.confidentialityLabel),
    executiveSummary: report.summary,
    securityScore:
      typeof snapshot.securityScore === "number"
        ? snapshot.securityScore
        : latestCompliance?.overallScore ?? null,
    criticalFindings: asStringArray(report.findings),
    affectedAssets,
    eventTimeline,
    riskMatrix: asStringArray(report.risks).map((risk, index) => ({
      id: `risk-${index + 1}`,
      label: risk,
      level: inferRiskLevel(risk),
      detail: risk,
    })),
    nistCsfMapping:
      nistMappingFromSnapshot.length > 0
        ? nistMappingFromSnapshot.map((entry, index) => ({
            id: String(entry.id ?? `nist-${index + 1}`),
            name: String(entry.name ?? `Function ${index + 1}`),
            score: Number(entry.score ?? 0),
            status: String(entry.status ?? "warning"),
            gaps: asStringArray(entry.gaps),
            improvements: asStringArray(entry.improvements),
          }))
        : (latestCompliance?.functions ?? []).map((entry) => ({
            id: entry.id,
            name: entry.name,
            score: entry.score,
            status: entry.status,
            gaps: asStringArray(entry.gaps),
            improvements: asStringArray(entry.improvements),
          })),
    kvkkGdprImpact: {
      kvkkScore:
        typeof privacyImpact.kvkkScore === "number"
          ? privacyImpact.kvkkScore
          : latestCompliance?.kvkkScore ?? null,
      gdprScore:
        typeof privacyImpact.gdprScore === "number"
          ? privacyImpact.gdprScore
          : latestCompliance?.gdprScore ?? null,
      scopedAssets: affectedAssets.filter((asset) => ["critical", "high"].includes(asset.riskLevel)).length,
      summary: `${affectedAssets.length} bağlı varlık ve gizlilik etkisi rapor snapshot üzerinden normalize edildi.`,
    },
    recommendedActions: asStringArray(report.recommendedActions),
    appendix: {
      relatedControls: asStringArray(report.relatedControls),
      markdownContent: report.markdownContent ?? "",
      evidence: eventTimeline.flatMap((event) => event.entries.map((entry) => `${event.title}: ${entry.message}`)).slice(0, 12),
    },
    footer: branding?.reportFooter ?? "Generated by Hybrid Cloud Security Console",
  };
}

export async function recordReportPrinted(input: {
  organizationId: string;
  reportId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const report = await prisma.report.findFirst({
    where: {
      id: input.reportId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!report) {
    return null;
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "report_printed",
    module: "Reports",
    target: report.title,
    severity: "info",
    result: "success",
    details: `${report.title} print payload üzerinden yazdırıldı.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      reportId: report.id,
    },
  });

  return {
    reportId: report.id,
    title: report.title,
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
