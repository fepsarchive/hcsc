import type { Asset as DbAsset, RiskLevel } from "@prisma/client";

import { calculateAssetRisk } from "@/lib/risk-engine";
import { prisma } from "@/server/db/prisma";
import { mapAssetRecord, mapSecurityEventRecord, normalizeRiskLevel } from "@/server/services/core/domain-mappers";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function buildDefaultControls(asset: DbAsset) {
  const controls = new Set<string>();

  if (asset.classification === "critical") controls.add("RBAC/ABAC");
  if (!asset.encryptionEnabled) controls.add("Encryption");
  if (!asset.kmsEnabled) controls.add("KMS");
  if (!asset.backupEnabled) controls.add("Backup");
  if (asset.location === "public_cloud") controls.add("CSPM");
  if (asset.kvkkScope || asset.gdprScope) controls.add("DLP");

  return [...controls];
}

function buildPolicyAdjustedRisk(input: {
  asset: DbAsset;
  baseScore: number;
  baseReasons: string[];
  baseControls: string[];
  openCriticalEventCount: number;
  deceptionTriggerCount: number;
  riskPolicy: {
    criticalClassificationWeight: number;
    missingEncryptionWeight: number;
    publicCloudSensitiveWeight: number;
    missingBackupWeight: number;
    noKmsWeight: number;
    openCriticalEventWeight: number;
    deceptionTriggerWeight: number;
  } | null;
}) {
  const policy = input.riskPolicy ?? {
    criticalClassificationWeight: 24,
    missingEncryptionWeight: 18,
    publicCloudSensitiveWeight: 16,
    missingBackupWeight: 10,
    noKmsWeight: 12,
    openCriticalEventWeight: 14,
    deceptionTriggerWeight: 20,
  };

  let score = input.baseScore;
  const reasons = [...input.baseReasons];
  const recommendedControls = new Set([
    ...input.baseControls,
    ...buildDefaultControls(input.asset),
  ]);

  if (input.asset.classification === "critical") {
    score += policy.criticalClassificationWeight * 0.14;
    reasons.push("Organization risk policy kritik sınıflandırmalı veriyi öncelikli risk olarak işaretliyor.");
  }

  if (!input.asset.encryptionEnabled) {
    score += policy.missingEncryptionWeight * 0.18;
    reasons.push("Şifreleme eksikliği organization risk policy içinde yüksek ağırlığa sahip.");
    recommendedControls.add("Encryption");
  }

  if (!input.asset.kmsEnabled) {
    score += policy.noKmsWeight * 0.16;
    reasons.push("KMS eksikliği anahtar yönetimi riskini artırıyor.");
    recommendedControls.add("KMS");
  }

  if (!input.asset.backupEnabled) {
    score += policy.missingBackupWeight * 0.18;
    reasons.push("Backup eksikliği recoverability ve olay sonrası dayanıklılığı düşürüyor.");
    recommendedControls.add("Backup");
  }

  if (
    input.asset.location === "public_cloud" &&
    ["sensitive", "critical"].includes(input.asset.classification)
  ) {
    score += policy.publicCloudSensitiveWeight * 0.18;
    reasons.push("Public cloud üzerindeki hassas veri ek görünürlük ve kontrol gerektiriyor.");
    recommendedControls.add("CSPM");
  }

  if (input.asset.kvkkScope || input.asset.gdprScope) {
    score += 4;
    reasons.push("Regülasyon kapsamındaki veri için kontrol derinliği artırılmalı.");
    recommendedControls.add("DLP");
  }

  if (input.openCriticalEventCount > 0) {
    score += input.openCriticalEventCount * (policy.openCriticalEventWeight * 0.2);
    reasons.push(`İlgili ${input.openCriticalEventCount} açık kritik olay risk skorunu yükseltiyor.`);
    recommendedControls.add("SOAR");
    recommendedControls.add("SIEM");
  }

  if (input.deceptionTriggerCount > 0) {
    score += input.deceptionTriggerCount * (policy.deceptionTriggerWeight * 0.12);
    reasons.push(`Deception tetikleme korelasyonu ${input.deceptionTriggerCount} kez gözlendi.`);
    recommendedControls.add("Deception");
  }

  const finalScore = clampScore(score);
  const finalLevel = normalizeRiskLevel(finalScore) as RiskLevel;

  return {
    score: finalScore,
    level: finalLevel,
    reasons: unique(reasons).slice(0, 10),
    recommendedControls: [...recommendedControls].slice(0, 10),
  };
}

export async function recalculateAssetRiskWithEngine(input: {
  organizationId: string;
  assetId: string;
}) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: input.assetId,
      organizationId: input.organizationId,
    },
  });

  if (!asset) {
    return null;
  }

  const [riskPolicy, relatedEvents] = await Promise.all([
    prisma.riskPolicy.findUnique({
      where: {
        organizationId: input.organizationId,
      },
    }),
    prisma.securityEvent.findMany({
      where: {
        organizationId: input.organizationId,
        OR: [{ relatedAssetId: asset.id }, { target: { contains: asset.name, mode: "insensitive" } }],
      },
      include: {
        timelineEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  const deceptionTriggers = await prisma.deceptionTrigger.findMany({
    where: {
      organizationId: input.organizationId,
      eventId: {
        in: relatedEvents.map((event) => event.id),
      },
    },
  });

  const base = calculateAssetRisk(
    mapAssetRecord(asset),
    relatedEvents.map(mapSecurityEventRecord),
  );

  const openCriticalEventCount = relatedEvents.filter(
    (event) => event.status !== "resolved" && event.severity === "critical",
  ).length;

  const recalculated = buildPolicyAdjustedRisk({
    asset,
    baseScore: base.score,
    baseReasons: base.reasons,
    baseControls: base.recommendedControls,
    openCriticalEventCount,
    deceptionTriggerCount: deceptionTriggers.length,
    riskPolicy,
  });

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      riskScore: recalculated.score,
      riskLevel: recalculated.level,
      riskReasons: recalculated.reasons,
      recommendedControls: recalculated.recommendedControls,
      updatedAt: new Date(),
    },
  });

  return {
    asset: updated,
    metrics: {
      openCriticalEventCount,
      deceptionTriggerCount: deceptionTriggers.length,
    },
  };
}
