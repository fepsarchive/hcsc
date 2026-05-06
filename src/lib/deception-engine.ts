import { createSecurityEvent } from "@/lib/event-engine";
import { DeceptionAsset, IdentityProfile } from "@/types";

export function increaseLureScore(deceptionAsset: DeceptionAsset, amount = 2): DeceptionAsset {
  return {
    ...deceptionAsset,
    lureScore: Math.min(100, deceptionAsset.lureScore + amount),
  };
}

export function markIdentitySuspicious(identity: IdentityProfile, note: string): IdentityProfile {
  return {
    ...identity,
    anomalyScore: Math.min(100, identity.anomalyScore + 24),
    riskScore: Math.min(100, identity.riskScore + 22),
    status: identity.status === "isolated" ? "isolated" : "suspicious",
    notes: [note, ...identity.notes],
  };
}

export function getDeceptionRecommendation(deceptionAsset: DeceptionAsset, identity: IdentityProfile) {
  const actions = deceptionAsset.autoActions?.length
    ? deceptionAsset.autoActions
    : ["revoke_token", "isolate_identity", "notify_security_team", "create_ticket"];

  return {
    actions,
    summary: `${identity.name} ${deceptionAsset.name} deception kaynağını tetikledi; kimlik izolasyonu ve token iptali öneriliyor.`,
  };
}

export function createDeceptionEvent(
  deceptionAsset: DeceptionAsset,
  identity: IdentityProfile,
  timestamp = new Date().toISOString(),
) {
  return createSecurityEvent({
    title: "Deception depolama erişimi",
    severity: deceptionAsset.severity ?? "critical",
    category: "deception_triggered",
    source: identity.name,
    target: deceptionAsset.name,
    timestamp,
    description:
      "Sahte depolama veya lure kaynağına erişim, aktif savunma kapsamında düşmanca keşif olarak değerlendirildi.",
    relatedControl: "Deception + SIEM/SOAR",
    recommendation: deceptionAsset.recommendedResponse,
    evidence: [
      "Contains real data: false",
      `Mapped threat: ${deceptionAsset.mappedThreat}`,
      `Identity type: ${identity.type}`,
    ],
    relatedIdentityId: identity.id,
  });
}

export function triggerDeceptionAccess(
  deceptionAsset: DeceptionAsset,
  identity: IdentityProfile,
  timestamp = new Date().toISOString(),
) {
  const recommendation = getDeceptionRecommendation(deceptionAsset, identity);
  const event = createDeceptionEvent(deceptionAsset, identity, timestamp);

  const updatedIdentity = markIdentitySuspicious(
    identity,
    `${deceptionAsset.name} deception varlığı ${timestamp} anında tetiklendi.`,
  );

  const updatedDeception = increaseLureScore(
    {
      ...deceptionAsset,
      status: "triggered",
      triggerCount: deceptionAsset.triggerCount + 1,
      lastTriggeredAt: timestamp,
      severity: deceptionAsset.severity ?? "critical",
      containsRealData: false,
    },
    3,
  );

  return {
    event,
    updatedIdentity,
    updatedDeception,
    recommendation,
  };
}

export function triggerDeceptionIncident(input: {
  actor: IdentityProfile;
  deception: DeceptionAsset;
  timestamp?: string;
}) {
  const result = triggerDeceptionAccess(
    input.deception,
    input.actor,
    input.timestamp ?? new Date().toISOString(),
  );

  return {
    event: result.event,
    updatedIdentity: result.updatedIdentity,
    updatedDeception: result.updatedDeception,
  };
}
