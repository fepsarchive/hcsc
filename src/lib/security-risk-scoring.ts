import type { Asset, EventCategory, EventSeverity, Prisma, SecurityEvent } from "@prisma/client";

export type RiskComputation = {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  reasons: string[];
};

type AssetRiskInput = Pick<
  Asset,
  | "classification"
  | "location"
  | "storageType"
  | "encryptionEnabled"
  | "kmsEnabled"
  | "backupEnabled"
  | "kvkkScope"
  | "gdprScope"
  | "isDeception"
  | "exposure"
>;

const severityWeights: Record<EventSeverity, number> = {
  info: 2,
  low: 8,
  medium: 16,
  high: 26,
  critical: 38,
};

const categoryWeights: Partial<Record<EventCategory, number>> = {
  auth_failure: 10,
  mfa_failure: 14,
  admin_access_denied: 22,
  trap_triggered: 38,
  deception_triggered: 38,
  data_asset_risk: 18,
  compliance_gap: 12,
  system_health_degraded: 18,
  unauthorized_access_attempt: 22,
  public_bucket_detected: 22,
  missing_encryption: 18,
  privilege_escalation: 26,
  ransomware_indicator: 32,
};

export function clampRiskScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getRiskLevel(score: number): RiskComputation["level"] {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function pushReason(reasons: string[], condition: boolean, reason: string) {
  if (condition) reasons.push(reason);
}

export function calculateEventRisk(input: {
  severity: EventSeverity;
  category: EventCategory;
  targetType?: string | null;
  metadata?: Prisma.JsonValue | Prisma.InputJsonValue | null;
}): RiskComputation {
  const reasons: string[] = [];
  let score = severityWeights[input.severity] ?? 0;

  if (categoryWeights[input.category]) {
    score += categoryWeights[input.category] ?? 0;
    reasons.push(`Event category ${input.category} raises risk.`);
  }

  pushReason(reasons, input.severity === "critical", "Critical severity event requires immediate review.");
  pushReason(reasons, input.severity === "high", "High severity event increases operational risk.");
  pushReason(reasons, input.targetType === "admin", "Admin target increases privilege risk.");
  pushReason(reasons, input.targetType === "asset", "Asset target may affect protected cloud inventory.");

  return {
    score: clampRiskScore(score),
    level: getRiskLevel(score),
    reasons: reasons.length ? reasons : ["Baseline informational event risk."],
  };
}

export function calculateAssetRisk(
  asset: AssetRiskInput,
  relatedEvents: Pick<SecurityEvent, "severity" | "category" | "status" | "createdAt">[] = [],
): RiskComputation {
  const reasons: string[] = [];
  let score = 0;

  const sensitivityWeight = {
    public: 4,
    internal: 10,
    confidential: 22,
    sensitive: 34,
    critical: 46,
  }[asset.classification];
  score += sensitivityWeight;
  pushReason(reasons, asset.classification === "critical", "Asset sensitivity is CRITICAL.");
  pushReason(reasons, asset.classification === "sensitive", "Asset contains sensitive data.");

  if (asset.exposure === "public") {
    score += 24;
    reasons.push("Asset exposure is PUBLIC.");
  } else if (asset.exposure === "shared") {
    score += 14;
    reasons.push("Asset exposure is SHARED.");
  } else if (asset.exposure === "unknown") {
    score += 10;
    reasons.push("Asset exposure is UNKNOWN.");
  }

  pushReason(reasons, asset.location === "public_cloud", "Asset is hosted in public cloud scope.");
  if (asset.location === "public_cloud") score += 8;

  if (!asset.encryptionEnabled) {
    score += 14;
    reasons.push("Encryption is not enabled.");
  }
  if (!asset.kmsEnabled) {
    score += 9;
    reasons.push("KMS is not enabled.");
  }
  if (!asset.backupEnabled) {
    score += 7;
    reasons.push("Backup is not enabled.");
  }
  if (asset.kvkkScope || asset.gdprScope) {
    score += 5;
    reasons.push("Asset is in regulatory/privacy scope.");
  }
  if (asset.isDeception) {
    score += 6;
    reasons.push("Asset is linked to active defense/deception telemetry.");
  }

  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentEvents = relatedEvents.filter((event) => event.createdAt.getTime() >= recentCutoff);
  const openHighEvents = relatedEvents.filter(
    (event) => event.status !== "resolved" && event.status !== "false_positive" && ["high", "critical"].includes(event.severity),
  );

  if (recentEvents.length) {
    score += Math.min(15, recentEvents.length * 3);
    reasons.push(`${recentEvents.length} related security event(s) observed in the last 24 hours.`);
  }
  if (openHighEvents.length) {
    score += Math.min(20, openHighEvents.length * 7);
    reasons.push(`${openHighEvents.length} open high/critical event(s) are linked to this asset.`);
  }

  return {
    score: clampRiskScore(score),
    level: getRiskLevel(score),
    reasons: [...new Set(reasons)].slice(0, 10),
  };
}
