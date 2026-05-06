import {
  AccessRequest,
  CloudLocation,
  DataAsset,
  IdentityProfile,
  ZeroTrustDecision,
  ZeroTrustEvaluation,
  ZeroTrustInput,
} from "@/types";
import { clamp } from "@/lib/utils";

function pickDecision(score: number): ZeroTrustDecision {
  if (score >= 92) return "isolate";
  if (score >= 76) return "deny";
  if (score >= 56) return "require_step_up_auth";
  if (score >= 34) return "limited_allow";
  return "allow";
}

type RequestContext = {
  recentEvents?: string[];
  targetIsDeception?: boolean;
  targetLocation?: CloudLocation;
};

function normalizeDecision(score: number, reasons: string[], context: RequestContext): ZeroTrustDecision {
  if (context.targetIsDeception) return "isolate";
  if (reasons.some((reason) => reason.includes("deception"))) return "isolate";
  return pickDecision(score);
}

export function evaluateZeroTrustRequest(
  request: Pick<
    AccessRequest,
    "identityType" | "mfa" | "deviceTrust" | "requestedAction" | "locationRisk" | "timeRisk" | "anomalyScore"
  >,
  asset: Pick<DataAsset, "classification" | "location" | "isDeception" | "name">,
  identity: Pick<IdentityProfile, "role" | "type" | "status" | "mfaEnabled">,
  context: RequestContext = {},
): ZeroTrustEvaluation {
  const reasons: string[] = [];
  const requiredActions = new Set<string>();
  const policyMatches: string[] = [];
  let score = 0;

  const targetIsDeception = Boolean(asset.isDeception || context.targetIsDeception || asset.location === "deception");
  const isThirdParty = request.identityType === "third_party";
  const isServiceAccount = request.identityType === "service";
  const recentEvents = context.recentEvents ?? [];

  if (targetIsDeception) {
    reasons.push("Deception varlığına erişim denemesi aktif savunma kuralını tetikledi.");
    policyMatches.push("deception_access_isolate");
    requiredActions.add("isolate_identity");
    requiredActions.add("revoke_token");
    requiredActions.add("notify_security_team");
    requiredActions.add("create_ticket");

    return {
      decision: "isolate",
      riskScore: 99,
      reasons,
      requiredActions: [...requiredActions],
      policyMatches,
    };
  }

  const sensitivityBase = {
    public: 4,
    internal: 10,
    confidential: 18,
    sensitive: 28,
    critical: 38,
  }[asset.classification];

  score += sensitivityBase;
  score += request.anomalyScore * 0.35;

  if (!request.mfa || !identity.mfaEnabled) {
    score += 18;
    reasons.push("MFA sinyali eksik.");
    requiredActions.add("require_mfa");
    policyMatches.push("mfa_required");
  }

  if (request.deviceTrust === "unknown") {
    score += 12;
    reasons.push("Cihaz güven seviyesi belirsiz.");
  }

  if (request.deviceTrust === "compromised") {
    score += 26;
    reasons.push("Cihaz güvenilir değil.");
    requiredActions.add("isolate_identity");
    policyMatches.push("untrusted_device_block");
  }

  if (request.locationRisk === "medium") {
    score += 8;
    reasons.push("Lokasyon ek doğrulama gerektiriyor.");
  }

  if (request.locationRisk === "high") {
    score += 16;
    reasons.push("Yüksek riskli lokasyon algılandı.");
    requiredActions.add("create_ticket");
    policyMatches.push("high_location_risk");
  }

  if (request.timeRisk === "elevated") {
    score += 6;
    reasons.push("Zaman penceresi olağan dışı.");
  }

  if (request.timeRisk === "off_hours") {
    score += 12;
    reasons.push("Mesai dışı talep.");
    policyMatches.push("off_hours_request");
  }

  if (["export", "delete", "admin"].includes(request.requestedAction)) {
    score += 18;
    reasons.push("Yüksek etkili işlem talep edildi.");
    policyMatches.push("high_impact_action");
  }

  if (asset.classification === "critical" && (!request.mfa || !identity.mfaEnabled)) {
    score += 20;
    reasons.push("Kritik veri için MFA zorunluluğu karşılanmadı.");
    policyMatches.push("critical_data_requires_mfa");
  }

  if (isThirdParty) {
    score += 14;
    reasons.push("Üçüncü taraf kimlik erişimi ek sınırlama gerektiriyor.");
    policyMatches.push("third_party_restriction");
  }

  if (isThirdParty && ["sensitive", "critical"].includes(asset.classification)) {
    score += 12;
    reasons.push("Hassas varlığa üçüncü taraf erişimi kısıtlanmalı.");
  }

  if (isServiceAccount) {
    score += 8;
    reasons.push("Servis hesabı davranışı sürekli izlenmeli.");
  }

  if (isServiceAccount && request.anomalyScore >= 72) {
    score += 14;
    reasons.push("Servis hesabı olağan dışı veri hacmi paterni gösteriyor.");
    requiredActions.add("revoke_token");
    policyMatches.push("service_account_volume_spike");
  }

  if (recentEvents.includes("impossible_travel")) {
    score += 14;
    reasons.push("Yakın geçmişte impossible travel sinyali var.");
    policyMatches.push("impossible_travel_guard");
  }

  if (recentEvents.includes("deception_triggered")) {
    score += 18;
    reasons.push("Kimlik yakın geçmişte deception alarmı ile ilişkili.");
    requiredActions.add("isolate_identity");
  }

  if (recentEvents.includes("privilege_escalation")) {
    score += 16;
    reasons.push("Kimlik son olaylarda privilege escalation ile ilişkili.");
  }

  const riskScore = clamp(Math.round(score), 0, 100);
  const decision = normalizeDecision(riskScore, reasons, {
    recentEvents,
    targetIsDeception,
    targetLocation: context.targetLocation ?? asset.location,
  });

  if (decision === "limited_allow") requiredActions.add("limited_allow");
  if (decision === "require_step_up_auth") requiredActions.add("require_step_up_auth");
  if (decision === "deny") requiredActions.add("notify_security_team");
  if (decision === "isolate") {
    requiredActions.add("isolate_identity");
    requiredActions.add("notify_security_team");
  }

  if (!reasons.length) reasons.push("Talep bağlamsal sinyaller açısından düşük riskli kabul edildi.");

  return {
    decision,
    riskScore,
    reasons,
    requiredActions: [...requiredActions],
    policyMatches,
  };
}

export function evaluateZeroTrustAccess(input: ZeroTrustInput): ZeroTrustEvaluation {
  return evaluateZeroTrustRequest(
    {
      identityType: input.identityType ?? (input.isThirdParty ? "third_party" : input.isServiceAccount ? "service" : "user"),
      mfa: input.mfa,
      deviceTrust: input.deviceTrust,
      requestedAction: input.requestedAction,
      locationRisk: input.locationRisk,
      timeRisk: input.timeRisk,
      anomalyScore: input.anomalyScore,
    },
    {
      classification: input.dataSensitivity,
      location: input.targetLocation ?? "private_cloud",
      isDeception: input.isDeceptionTarget,
      name: "target",
    },
    {
      role: input.role,
      type: input.identityType ?? (input.isThirdParty ? "third_party" : input.isServiceAccount ? "service" : "user"),
      status: input.identityVerified ? "active" : "watchlist",
      mfaEnabled: input.mfa,
    },
    {
      recentEvents: input.recentEvents,
      targetIsDeception: input.isDeceptionTarget,
      targetLocation: input.targetLocation,
    },
  );
}
