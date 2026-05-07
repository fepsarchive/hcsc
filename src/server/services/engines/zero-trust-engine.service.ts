import type { RequestStatus, SecurityEvent as DbSecurityEvent } from "@prisma/client";

import { evaluateZeroTrustRequest } from "@/lib/zero-trust-engine";
import { prisma } from "@/server/db/prisma";
import { mapAccessRequestRecord } from "@/server/services/core/domain-mappers";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function mapDecisionToStatus(decision: ReturnType<typeof evaluateZeroTrustRequest>["decision"]): RequestStatus {
  switch (decision) {
    case "allow":
      return "approved";
    case "limited_allow":
      return "approved";
    case "require_step_up_auth":
      return "step_up";
    case "deny":
      return "rejected";
    case "isolate":
      return "isolated";
  }
}

function scoreToDecision(score: number) {
  if (score >= 92) return "isolate" as const;
  if (score >= 76) return "deny" as const;
  if (score >= 56) return "require_step_up_auth" as const;
  if (score >= 34) return "limited_allow" as const;
  return "allow" as const;
}

function buildEventCategory(input: {
  decision: "allow" | "limited_allow" | "require_step_up_auth" | "deny" | "isolate";
  action: string;
  isDeception: boolean;
}): DbSecurityEvent["category"] {
  if (input.isDeception) return "deception_triggered";
  if (input.action === "export") return "suspicious_export";
  if (input.decision === "isolate" || input.decision === "deny") return "unauthorized_access_attempt";
  return "policy_violation";
}

export async function evaluateAccessRequestWithEngine(input: {
  organizationId: string;
  requestId: string;
}) {
  const request = await prisma.accessRequest.findFirst({
    where: {
      id: input.requestId,
      organizationId: input.organizationId,
    },
    include: {
      identityProfile: true,
      asset: true,
    },
  });

  if (!request) {
    return null;
  }

  const [riskPolicy, relatedEvents] = await Promise.all([
    prisma.riskPolicy.findUnique({
      where: { organizationId: input.organizationId },
    }),
    prisma.securityEvent.findMany({
      where: {
        organizationId: input.organizationId,
        OR: [{ relatedIdentityId: request.identityProfileId }, { relatedAssetId: request.assetId }],
      },
      select: {
        id: true,
        category: true,
        severity: true,
        status: true,
        relatedAccessRequestId: true,
      },
    }),
  ]);

  const base = evaluateZeroTrustRequest(
    {
      identityType: request.identityProfile.type,
      mfa: request.mfa,
      deviceTrust: request.deviceTrust,
      requestedAction: request.requestedAction,
      locationRisk: request.locationRisk as "low" | "medium" | "high",
      timeRisk: request.timeRisk as "normal" | "elevated" | "off_hours",
      anomalyScore: request.anomalyScore,
    },
    {
      classification: request.asset.classification,
      location: request.asset.location,
      isDeception: request.asset.isDeception,
      name: request.asset.name,
    },
    {
      role: request.identityProfile.role,
      type: request.identityProfile.type,
      status: request.identityProfile.status,
      mfaEnabled: request.identityProfile.mfaEnabled,
    },
    {
      targetIsDeception: request.asset.isDeception,
      targetLocation: request.asset.location,
      recentEvents: relatedEvents.map((event) => event.category),
    },
  );

  let score = base.riskScore;
  const reasons = [...base.reasons];
  const requiredActions = new Set(base.requiredActions);
  const policyMatches = new Set(base.policyMatches);
  const openCriticalEvents = relatedEvents.filter(
    (event) => event.status !== "resolved" && event.severity === "critical",
  ).length;

  if (request.identityProfile.status === "isolated") {
    score = 99;
    reasons.push("Kimlik zaten izole durumda, talep otomatik olarak en yüksek riskte değerlendirildi.");
    requiredActions.add("isolate_identity");
  } else if (request.identityProfile.status === "suspicious") {
    score += 18;
    reasons.push("Kimlik şüpheli olarak işaretlenmiş.");
    requiredActions.add("notify_security_team");
  } else if (request.identityProfile.status === "watchlist") {
    score += 8;
    reasons.push("Kimlik watchlist altında izleniyor.");
  }

  if (request.asset.riskScore >= 80) {
    score += 14;
    reasons.push("Hedef varlık zaten kritik risk seviyesinde.");
    requiredActions.add("create_ticket");
  } else if (request.asset.riskScore >= 60) {
    score += 8;
    reasons.push("Hedef varlık yüksek riskli olarak sınıflandırıldı.");
  }

  if ((request.asset.kvkkScope || request.asset.gdprScope) && ["export", "delete", "admin"].includes(request.requestedAction)) {
    score += 12;
    reasons.push("Regülasyon kapsamındaki veri için yüksek etkili işlem talep edildi.");
    requiredActions.add("require_mfa");
    policyMatches.add("regulated_data_elevated_control");
  }

  if (!request.identityProfile.mfaEnabled && request.asset.classification === "critical") {
    score += 10;
    reasons.push("Kritik varlığa MFA etkin olmayan kimlik erişmeye çalışıyor.");
    requiredActions.add("require_mfa");
  }

  if (openCriticalEvents > 0) {
    score += openCriticalEvents * Math.max(2, Math.round((riskPolicy?.openCriticalEventWeight ?? 14) * 0.18));
    reasons.push(`İlgili ${openCriticalEvents} açık kritik olay karar sertliğini artırdı.`);
    requiredActions.add("notify_security_team");
  }

  if (request.requestedAction === "export" && request.asset.classification === "critical") {
    score += 10;
    policyMatches.add("critical_export_requires_step_up");
  }

  const finalScore = clampScore(score);
  const finalDecision =
    request.asset.isDeception || request.identityProfile.status === "isolated"
      ? "isolate"
      : scoreToDecision(finalScore);

  if (finalDecision === "deny") requiredActions.add("notify_security_team");
  if (finalDecision === "isolate") {
    requiredActions.add("isolate_identity");
    requiredActions.add("revoke_token");
    requiredActions.add("notify_security_team");
  }
  if (finalDecision === "require_step_up_auth") {
    requiredActions.add("require_step_up_auth");
  }

  const updated = await prisma.accessRequest.update({
    where: { id: request.id },
    data: {
      decision: finalDecision,
      riskScore: finalScore,
      status: mapDecisionToStatus(finalDecision),
      decisionReasons: unique(reasons),
      requiredActions: [...requiredActions],
      policyMatches: [...policyMatches],
      decidedAt: new Date(),
    },
    include: {
      identityProfile: true,
      asset: true,
    },
  });

  let relatedEventId: string | null = null;

  if (["require_step_up_auth", "deny", "isolate"].includes(finalDecision)) {
    const category = buildEventCategory({
      decision: finalDecision,
      action: request.requestedAction,
      isDeception: request.asset.isDeception,
    });

    const eventTitle =
      finalDecision === "isolate"
        ? "Zero Trust isolation decision"
        : finalDecision === "deny"
          ? "Zero Trust access denied"
          : "Zero Trust step-up required";

    const existingEvent = await prisma.securityEvent.findFirst({
      where: {
        organizationId: input.organizationId,
        relatedAccessRequestId: request.id,
      },
      include: {
        timelineEntries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const severity =
      finalDecision === "isolate"
        ? "critical"
        : finalDecision === "deny"
          ? "high"
          : "medium";

    const eventPayload = {
      title: eventTitle,
      severity,
      category,
      source: "Zero Trust Engine",
      target: request.asset.name,
      description: unique(reasons).join(" "),
      relatedControl: "Zero Trust Policy Engine",
      recommendation: [...requiredActions].join(", "),
      status: finalDecision === "isolate" ? "contained" : "investigating",
      evidence: {
        accessRequestId: request.id,
        identityId: request.identityProfile.id,
        assetId: request.asset.id,
        riskScore: finalScore,
      },
      playbookActions: [...requiredActions].filter((action) =>
        ["isolate_identity", "revoke_token", "require_mfa", "create_ticket", "notify_security_team"].includes(action),
      ),
      relatedAssetId: request.asset.id,
      relatedIdentityId: request.identityProfile.id,
      relatedAccessRequestId: request.id,
    } as const;

    const event = existingEvent
      ? await prisma.securityEvent.update({
          where: { id: existingEvent.id },
          data: {
            ...eventPayload,
            updatedAt: new Date(),
          },
        })
      : await prisma.securityEvent.create({
          data: {
            organizationId: input.organizationId,
            ...eventPayload,
          },
        });

    const timelineMessage = `Zero Trust engine ${finalDecision} kararı üretti (${finalScore}/100).`;
    if (existingEvent?.timelineEntries[0]?.message !== timelineMessage) {
      await prisma.eventTimelineEntry.create({
        data: {
          eventId: event.id,
          actor: "Zero Trust Engine",
          message: timelineMessage,
        },
      });
    }

    relatedEventId = event.id;
  }

  return {
    request: mapAccessRequestRecord(updated),
    relatedEventId,
    decision: finalDecision,
    riskScore: finalScore,
    createdHighRiskSignal: ["deny", "isolate"].includes(finalDecision) || finalScore >= 80,
  };
}
