import type {
  AccessRequest as DbAccessRequest,
  Asset as DbAsset,
  AuditLog,
  CloudLocation,
  ComplianceFunctionScore as DbComplianceFunctionScore,
  ComplianceSnapshot as DbComplianceSnapshot,
  DeceptionAsset as DbDeceptionAsset,
  EventTimelineEntry as DbEventTimelineEntry,
  IdentityProfile as DbIdentityProfile,
  Notification as DbNotification,
  Report as DbReport,
  RiskLevel,
  SecurityEvent as DbSecurityEvent,
  SimulationRun as DbSimulationRun,
} from "@prisma/client";

import type {
  AccessRequest,
  ComplianceFunctionScore,
  ComplianceSnapshot,
  DataAsset,
  DeceptionAsset,
  EventTimelineEntry,
  IdentityProfile,
  NotificationItem,
  ReportItem,
  SecurityEvent,
  SimulationRunResult,
} from "@/types";

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeReportType(type: DbReport["type"]): ReportItem["type"] {
  switch (type) {
    case "critical_data":
      return "critical-data";
    case "zero_trust":
      return "zero-trust";
    default:
      return type;
  }
}

function normalizeNotificationSeverity(severity: DbNotification["severity"]): NotificationItem["severity"] {
  return severity;
}

export function mapTimelineEntry(entry: DbEventTimelineEntry): EventTimelineEntry {
  return {
    id: entry.id,
    actor: entry.actor,
    message: entry.message,
    timestamp: entry.createdAt.toISOString(),
  };
}

export function mapAssetRecord(asset: DbAsset): DataAsset {
  const recommendedControls = asStringArray(asset.recommendedControls);
  const reasons = asStringArray(asset.riskReasons);

  return {
    id: asset.id,
    name: asset.name,
    path: asset.path,
    dataType: asset.dataType,
    location: asset.location,
    storageType: asset.storageType,
    classification: asset.classification,
    temperature: asset.temperature,
    owner: asset.owner,
    encryptionEnabled: asset.encryptionEnabled,
    kmsEnabled: asset.kmsEnabled,
    backupEnabled: asset.backupEnabled,
    kvkkScope: asset.kvkkScope,
    gdprScope: asset.gdprScope,
    privacyTags: asStringArray(asset.privacyTags),
    retentionPolicy: asset.retentionPolicy,
    anonymizationStatus: asset.anonymizationStatus as DataAsset["anonymizationStatus"],
    lastAccessedAt: asset.lastAccessedAt?.toISOString() ?? asset.updatedAt.toISOString(),
    accessCount24h: asset.accessCount24h,
    accessIntensity: asset.accessIntensity,
    risk: {
      score: asset.riskScore,
      level: asset.riskLevel,
      reasons: reasons.length ? reasons : ["Henüz ayrıntılı risk nedeni kaydı yok."],
      recommendedControls,
      recommendedActions: recommendedControls.slice(0, 6),
    },
    findings: asStringArray(asset.findings),
    recommendedControls,
    isDeception: asset.isDeception,
  };
}

export function mapIdentityRecord(identity: DbIdentityProfile): IdentityProfile {
  return {
    id: identity.id,
    name: identity.name,
    type: identity.type,
    role: identity.role,
    department: identity.department ?? "Security",
    homeLocation: identity.homeLocation,
    region: identity.region,
    mfaEnabled: identity.mfaEnabled,
    deviceTrust: identity.deviceTrust,
    anomalyScore: identity.anomalyScore,
    riskScore: identity.riskScore,
    status: identity.status,
    lastSeenAt: identity.lastSeenAt?.toISOString() ?? identity.updatedAt.toISOString(),
    notes: asStringArray(identity.notes),
    accessVolume24h: identity.accessVolume24h,
    tags: asStringArray(identity.tags),
  };
}

export function mapAccessRequestRecord(
  request: DbAccessRequest & {
    identityProfile: DbIdentityProfile;
    asset: DbAsset;
  },
): AccessRequest {
  return {
    id: request.id,
    identityId: request.identityProfileId,
    identityName: request.identityProfile.name,
    identityType: request.identityProfile.type,
    role: request.identityProfile.role,
    targetAssetId: request.assetId,
    targetAssetName: request.asset.name,
    sourceLocation: request.sourceLocation as AccessRequest["sourceLocation"],
    sourceRegion: request.sourceRegion,
    deviceTrust: request.deviceTrust,
    requestTime: request.requestedAt.toISOString(),
    requestedAction: request.requestedAction,
    mfa: request.mfa,
    anomalyScore: request.anomalyScore,
    locationRisk: request.locationRisk as "low" | "medium" | "high",
    timeRisk: request.timeRisk as "normal" | "elevated" | "off_hours",
    dataSensitivity: request.asset.classification,
    evaluation: {
      decision: request.decision ?? "allow",
      riskScore: request.riskScore ?? 0,
      reasons: asStringArray(request.decisionReasons),
      requiredActions: asStringArray(request.requiredActions),
      policyMatches: asStringArray(request.policyMatches),
    },
    status: request.status,
  };
}

export function mapSecurityEventRecord(
  event: DbSecurityEvent & {
    timelineEntries?: DbEventTimelineEntry[];
  },
): SecurityEvent {
  const evidence = asRecordArray(event.evidence).map((entry) =>
    typeof entry === "string" ? entry : JSON.stringify(entry),
  );

  return {
    id: event.id,
    title: event.title,
    severity: event.severity,
    category: event.category,
    source: event.source,
    target: event.target,
    timestamp: event.createdAt.toISOString(),
    description: event.description,
    relatedControl: event.relatedControl ?? "",
    recommendation: event.recommendation ?? "",
    status: event.status,
    playbookActions: asStringArray(event.playbookActions) as SecurityEvent["playbookActions"],
    evidence,
    timeline: (event.timelineEntries ?? []).map(mapTimelineEntry),
    relatedAssetId: event.relatedAssetId ?? undefined,
    relatedIdentityId: event.relatedIdentityId ?? undefined,
  };
}

export function mapDeceptionAssetRecord(asset: DbDeceptionAsset): DeceptionAsset {
  return {
    id: asset.id,
    name: asset.name,
    location: asset.location as CloudLocation,
    description: asset.description,
    realData: false,
    containsRealData: false,
    fakeType: asset.fakeType,
    lureScore: asset.lureScore,
    triggerCount: asset.triggerCount,
    lastTriggeredAt: asset.lastTriggeredAt?.toISOString(),
    mappedThreat: asset.mappedThreat,
    severity: asset.severity,
    recommendedResponse: asset.recommendedResponse,
    status: asset.triggerCount > 0 ? "triggered" : "armed",
    autoActions: asStringArray(asset.autoActions) as DeceptionAsset["autoActions"],
  };
}

export function mapComplianceSnapshotRecord(
  snapshot: DbComplianceSnapshot,
  functions: DbComplianceFunctionScore[],
): ComplianceSnapshot {
  return {
    overallScore: snapshot.overallScore,
    iso27001Score: snapshot.iso27001Score,
    kvkkScore: snapshot.kvkkScore,
    gdprScore: snapshot.gdprScore,
    nist: functions.map(
      (item): ComplianceFunctionScore => ({
        id: item.id,
        name: item.name,
        score: item.score,
        status: item.status as ComplianceFunctionScore["status"],
        controls: asStringArray(item.controls),
        gaps: asStringArray(item.gaps),
        improvements: asStringArray(item.improvements),
      }),
    ),
    indicators: asRecordArray(snapshot.indicators).map((entry, index) => {
      const indicator = (entry ?? {}) as Record<string, unknown>;
      return {
        label: String(indicator.label ?? `Indicator ${index + 1}`),
        value: String(indicator.value ?? ""),
        status: String(indicator.status ?? "warning") as ComplianceSnapshot["indicators"][number]["status"],
      };
    }),
    matrix: asRecordArray(snapshot.matrix).map((entry, index) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        id: String(row.id ?? `matrix-${index + 1}`),
        label: String(row.label ?? `Row ${index + 1}`),
        kvkk: String(row.kvkk ?? "partial") as ComplianceSnapshot["matrix"][number]["kvkk"],
        gdpr: String(row.gdpr ?? "partial") as ComplianceSnapshot["matrix"][number]["gdpr"],
        iso27001: String(row.iso27001 ?? "partial") as ComplianceSnapshot["matrix"][number]["iso27001"],
        nist: String(row.nist ?? "partial") as ComplianceSnapshot["matrix"][number]["nist"],
      };
    }),
  };
}

export function mapReportRecord(report: DbReport): ReportItem {
  return {
    id: report.id,
    title: report.title,
    type: normalizeReportType(report.type),
    createdAt: report.createdAt.toISOString(),
    summary: report.summary,
    findings: asStringArray(report.findings),
    risks: asStringArray(report.risks),
    recommendedActions: asStringArray(report.recommendedActions),
    relatedControls: asStringArray(report.relatedControls),
    relatedEventIds: [],
    relatedAssetIds: [],
    markdownContent: report.markdownContent ?? undefined,
    status: report.status as ReportItem["status"],
  };
}

export function mapSimulationRunRecord(run: DbSimulationRun): SimulationRunResult {
  return {
    id: run.id,
    scenarioId: run.scenarioId,
    summary: run.summary,
    createdAt: run.createdAt.toISOString(),
    generatedEventIds: asStringArray(run.generatedEventIds),
    generatedReportIds: asStringArray(run.generatedReportIds),
    affectedModules: asStringArray(run.affectedModules),
  };
}

export function mapAuditLogRecord(log: AuditLog) {
  return {
    id: log.id,
    actorId: log.userId,
    actorName: log.actorName,
    actorRole: log.actorRole,
    action: log.action,
    module: log.module,
    target: log.target,
    severity: log.severity,
    result: log.result,
    timestamp: log.createdAt.toISOString(),
    ipAddress: log.ipAddress ?? "",
    device: log.device ?? "",
    details: log.details,
  };
}

export function mapNotificationRecord(notification: DbNotification): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.description,
    type: notification.type,
    severity: normalizeNotificationSeverity(notification.severity),
    module: notification.module,
    read: Boolean(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
    actionHref: notification.actionHref ?? undefined,
  };
}

export function normalizeRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function normalizeCloudLocation(location: DbAsset["location"] | DbDeceptionAsset["location"]) {
  return location as CloudLocation;
}
