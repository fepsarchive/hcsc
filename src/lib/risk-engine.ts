import {
  AccessRequest,
  DataAsset,
  IdentityProfile,
  RiskAssessment,
  RiskLevel,
  SecurityEvent,
} from "@/types";
import { clamp } from "@/lib/utils";

const classificationWeight = {
  public: 4,
  internal: 12,
  confidential: 26,
  sensitive: 42,
  critical: 58,
} as const;

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

type RiskReasonInput = {
  asset?: DataAsset;
  identity?: IdentityProfile;
  request?: AccessRequest;
  relatedEvents?: SecurityEvent[];
};

export function getRiskReasons(input: RiskReasonInput) {
  const reasons: string[] = [];
  const recommendedControls = new Set<string>();

  if (input.asset) {
    const asset = input.asset;

    if (asset.isDeception) {
      reasons.push("Bu varlık gerçek veri yerine deception / honeypot amaçlı tutulur.");
      recommendedControls.add("Deception");
      recommendedControls.add("SIEM");
    } else {
      if (["sensitive", "critical"].includes(asset.classification)) {
        reasons.push("Varlık yüksek hassasiyetli veri barındırıyor.");
        recommendedControls.add("RBAC/ABAC");
        recommendedControls.add("DLP");
      }

      if (asset.location === "public_cloud" && ["sensitive", "critical"].includes(asset.classification)) {
        reasons.push("Hassas veri public cloud üzerinde bulunuyor.");
        recommendedControls.add("CSPM");
        recommendedControls.add("Encryption");
      }

      if (!asset.encryptionEnabled) {
        reasons.push("At-rest encryption etkin değil.");
        recommendedControls.add("Encryption");
      }

      if (!asset.kmsEnabled) {
        reasons.push("Anahtar yaşam döngüsü KMS ile yönetilmiyor.");
        recommendedControls.add("KMS");
      }

      if (!asset.backupEnabled) {
        reasons.push("Doğrulanmış backup koruması eksik.");
        recommendedControls.add("Backup");
      }

      if (asset.kvkkScope || asset.gdprScope) {
        reasons.push("Regülasyon kapsamındaki kişisel veri işleniyor.");
        recommendedControls.add("Secure Deletion");
        recommendedControls.add("DLP");
      }

      if (asset.accessCount24h >= 100 || asset.accessIntensity >= 85) {
        reasons.push("Son 24 saatte olağan dışı erişim yoğunluğu görüldü.");
        recommendedControls.add("SIEM");
      } else if (asset.accessCount24h >= 50 || asset.accessIntensity >= 55) {
        reasons.push("Son 24 saatte beklenenin üzerinde erişim gözlendi.");
      }

      if (asset.anonymizationStatus === "missing") {
        reasons.push("Anonimleştirme veya imha durumu eksik.");
        recommendedControls.add("Secure Deletion");
      }
    }
  }

  if (input.identity) {
    const identity = input.identity;
    if (identity.status === "suspicious" || identity.status === "isolated") {
      reasons.push("Kimlik zaten şüpheli / izole durumunda.");
      recommendedControls.add("MFA");
      recommendedControls.add("IAM");
    }

    if (!identity.mfaEnabled) {
      reasons.push("Kimlik için MFA etkin değil.");
      recommendedControls.add("MFA");
    }

    if (identity.deviceTrust === "compromised") {
      reasons.push("Uç nokta güven seviyesi düşük.");
      recommendedControls.add("Microsegmentation");
    }
  }

  if (input.request) {
    const request = input.request;
    if (["export", "delete", "admin"].includes(request.requestedAction)) {
      reasons.push("Yüksek etkili işlem talep ediliyor.");
      recommendedControls.add("Zero Trust");
    }
    if (!request.mfa) {
      reasons.push("Talep MFA olmadan yapıldı.");
      recommendedControls.add("MFA");
    }
    if (request.locationRisk === "high") {
      reasons.push("Kaynak lokasyon yüksek riskli.");
      recommendedControls.add("IAM");
    }
    if (request.timeRisk === "off_hours") {
      reasons.push("Mesai dışı erişim penceresi tespit edildi.");
    }
  }

  if (input.relatedEvents?.length) {
    const criticalEvents = input.relatedEvents.filter((event) => event.severity === "critical");
    const openEvents = input.relatedEvents.filter((event) => event.status !== "resolved");
    if (criticalEvents.length) {
      reasons.push("İlgili açık kritik olaylar mevcut.");
      recommendedControls.add("SOAR");
      recommendedControls.add("SIEM");
    } else if (openEvents.length >= 2) {
      reasons.push("İlgili açık olay sayısı artıyor.");
      recommendedControls.add("SOAR");
    }
  }

  return {
    reasons,
    recommendedControls: [...recommendedControls],
  };
}

export function calculateAssetRisk(asset: DataAsset, relatedEvents: SecurityEvent[] = []): RiskAssessment {
  if (asset.isDeception) {
    return {
      score: 18,
      level: "low",
      reasons: [
        "Bu varlık deception amaçlıdır; veri kaybı değil erken tespit önceliklidir.",
        "Erişim olması durumunda olay önceliği yükseltilmelidir.",
      ],
      recommendedControls: ["Deception", "SIEM", "SOAR"],
      recommendedActions: ["Deception kapsamasını koru", "Trigger sonrası izolasyon uygula"],
    };
  }

  let score = classificationWeight[asset.classification];

  if (asset.location === "public_cloud" && ["sensitive", "critical"].includes(asset.classification)) score += 14;
  if (asset.location === "saas" && (asset.kvkkScope || asset.gdprScope)) score += 10;
  if (!asset.encryptionEnabled) score += 18;
  if (!asset.kmsEnabled) score += 10;
  if (!asset.backupEnabled) score += 10;
  if (asset.kvkkScope || asset.gdprScope) score += 8;
  if (asset.accessCount24h >= 100) score += 12;
  else if (asset.accessCount24h >= 50) score += 6;
  if (asset.accessIntensity >= 85) score += 8;
  else if (asset.accessIntensity >= 55) score += 4;
  if (asset.anonymizationStatus === "missing") score += 6;

  const related = relatedEvents.filter(
    (event) =>
      event.relatedAssetId === asset.id ||
      event.target === asset.name ||
      event.target.includes(asset.name) ||
      event.target.includes(asset.path),
  );

  score += related.filter((event) => event.status !== "resolved").length * 3;
  score += related.filter((event) => event.severity === "critical").length * 6;

  const { reasons, recommendedControls } = getRiskReasons({
    asset,
    relatedEvents: related,
  });

  if (!reasons.length) reasons.push("Temel koruma kontrolleri yerinde, anlık kritik zafiyet gözlenmiyor.");

  return {
    score: clamp(score, 0, 100),
    level: getRiskLevel(score),
    reasons,
    recommendedControls: recommendedControls.length ? recommendedControls : asset.recommendedControls,
    recommendedActions: (recommendedControls.length ? recommendedControls : asset.recommendedControls).slice(0, 6),
  };
}

export function calculateIdentityRisk(identity: IdentityProfile, events: SecurityEvent[]): RiskAssessment {
  let score = identity.anomalyScore * 0.6 + identity.riskScore * 0.4;

  if (!identity.mfaEnabled) score += 14;
  if (identity.deviceTrust === "unknown") score += 10;
  if (identity.deviceTrust === "compromised") score += 24;
  if (identity.type === "third_party") score += 12;
  if (identity.type === "service") score += 6;
  if (identity.status === "watchlist") score += 10;
  if (identity.status === "suspicious") score += 18;
  if (identity.status === "isolated") score += 28;

  const relatedEvents = events.filter(
    (event) => event.relatedIdentityId === identity.id || event.source === identity.name,
  );

  score += relatedEvents.filter((event) => event.status !== "resolved").length * 3;
  score += relatedEvents.filter((event) => event.severity === "critical").length * 5;

  const { reasons, recommendedControls } = getRiskReasons({
    identity,
    relatedEvents,
  });

  if (!reasons.length) reasons.push("Kimlik üzerinde belirgin bir kötüye kullanım sinyali bulunmuyor.");

  return {
    score: clamp(Math.round(score), 0, 100),
    level: getRiskLevel(score),
    reasons,
    recommendedControls,
    recommendedActions: recommendedControls,
  };
}

export function calculateRequestRisk(
  request: AccessRequest,
  asset: DataAsset,
  identity: IdentityProfile,
  relatedEvents: SecurityEvent[] = [],
) {
  let score = 0;
  score += classificationWeight[asset.classification] * 0.55;
  score += identity.anomalyScore * 0.35;
  if (!request.mfa) score += 12;
  if (request.deviceTrust === "unknown") score += 10;
  if (request.deviceTrust === "compromised") score += 20;
  if (request.locationRisk === "medium") score += 8;
  if (request.locationRisk === "high") score += 16;
  if (request.timeRisk === "elevated") score += 5;
  if (request.timeRisk === "off_hours") score += 10;
  if (["export", "delete", "admin"].includes(request.requestedAction)) score += 16;
  if (request.identityType === "third_party") score += 10;
  if (request.identityType === "service") score += 6;
  if (asset.isDeception) score = 99;

  const { reasons, recommendedControls } = getRiskReasons({
    request,
    asset,
    identity,
    relatedEvents,
  });

  return {
    score: clamp(Math.round(score), 0, 100),
    level: getRiskLevel(score),
    reasons,
    recommendedControls,
  };
}
