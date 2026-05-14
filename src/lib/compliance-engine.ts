import {
  ComplianceFunctionScore,
  ComplianceMatrixRow,
  ComplianceSnapshot,
  DataAsset,
  DemoEnvironment,
} from "@/types";
import { average } from "@/lib/utils";

function pct(part: number, total: number) {
  if (!total) return 100;
  return Math.round((part / total) * 100);
}

function statusFromScore(score: number): "healthy" | "warning" | "critical" {
  if (score >= 80) return "healthy";
  if (score >= 65) return "warning";
  return "critical";
}

export function calculateKvkkGdprStatus(assets: DataAsset[]) {
  const realAssets = assets.filter((asset) => !asset.isDeception);
  const personalAssets = realAssets.filter((asset) => asset.kvkkScope || asset.gdprScope);
  const encryptedPersonal = personalAssets.filter((asset) => asset.encryptionEnabled && asset.kmsEnabled);
  const anonymized = personalAssets.filter((asset) =>
    asset.anonymizationStatus === "applied" || asset.anonymizationStatus === "partial",
  );
  const withRetention = personalAssets.filter((asset) => !asset.retentionPolicy.toLowerCase().includes("belirsiz"));
  const overseasRisk = personalAssets.filter(
    (asset) => asset.location === "public_cloud" || asset.location === "saas",
  );

  return {
    personalAssets: personalAssets.length,
    overseasTransferRisk: overseasRisk.length,
    encryptedCoverage: pct(encryptedPersonal.length, personalAssets.length),
    anonymizationCoverage: pct(anonymized.length, personalAssets.length),
    retentionCoverage: pct(withRetention.length, personalAssets.length),
    kvkkScore: Math.round(
      average([
        pct(personalAssets.filter((asset) => asset.kvkkScope).length, personalAssets.length),
        pct(encryptedPersonal.length, personalAssets.length),
        pct(withRetention.length, personalAssets.length),
      ]),
    ),
    gdprScore: Math.round(
      average([
        pct(personalAssets.filter((asset) => asset.gdprScope).length, personalAssets.length),
        pct(encryptedPersonal.length, personalAssets.length),
        pct(anonymized.length, personalAssets.length),
      ]),
    ),
  };
}

export function calculateNistCsfScores(environment: Omit<DemoEnvironment, "compliance">): ComplianceFunctionScore[] {
  const realAssets = environment.assets.filter((asset) => !asset.isDeception);
  const sensitiveAssets = realAssets.filter((asset) => ["sensitive", "critical"].includes(asset.classification));
  const protectedSensitiveAssets = sensitiveAssets.filter((asset) => asset.encryptionEnabled && asset.kmsEnabled);
  const loggingCoverage = environment.events.filter((event) => event.category !== "visibility_gap").length;
  const deceptionsVisible = environment.deceptions.filter((asset) => asset.status === "armed" || asset.status === "triggered").length;
  const containedEvents = environment.events.filter((event) => ["contained", "resolved"].includes(event.status));
  const identityMfaCoverage = pct(
    environment.identities.filter((identity) => identity.mfaEnabled).length,
    environment.identities.length,
  );
  const backupCoverage = pct(
    realAssets.filter((asset) => asset.backupEnabled).length,
    realAssets.length,
  );

  const scores: ComplianceFunctionScore[] = [
    {
      id: "govern",
      name: "Govern",
      score: Math.round(
        average([
          pct(environment.policyRules.filter((rule) => rule.enabled).length, environment.policyRules.length),
          environment.reports.length >= 6 ? 88 : 64,
          78,
        ]),
      ),
      status: "healthy",
      controls: ["Policy Engine", "Risk ownership", "Reporting", "Control mapping"],
      gaps: ["Backend audit trail ve policy approval akışı eksik."],
      improvements: ["Policy versioning ve approval workflow eklenmeli."],
    },
    {
      id: "identify",
      name: "Identify",
      score: Math.round(
        average([
          pct(realAssets.filter((asset) => Boolean(asset.classification)).length, realAssets.length),
          pct(realAssets.filter((asset) => Boolean(asset.owner)).length, realAssets.length),
          84,
        ]),
      ),
      status: "healthy",
      controls: ["Asset inventory", "Classification", "Ownership"],
      gaps: ["Otomatik asset discovery ajanı yok."],
      improvements: ["Bulut connector ile envanter otomasyonu eklenmeli."],
    },
    {
      id: "protect",
      name: "Protect",
      score: Math.round(
        average([
          pct(protectedSensitiveAssets.length, sensitiveAssets.length),
          identityMfaCoverage,
          backupCoverage,
        ]),
      ),
      status: "warning",
      controls: ["Encryption", "KMS", "MFA", "Backup", "RBAC/ABAC"],
      gaps: ["Bazı public cloud ve SaaS varlıklarda protection coverage eksik."],
      improvements: ["Sensitive veri için KMS ve MFA enforce edilmeli."],
    },
    {
      id: "detect",
      name: "Detect",
      score: Math.round(
        average([
          pct(loggingCoverage, environment.events.length),
          pct(deceptionsVisible, environment.deceptions.length),
          environment.events.some((event) => event.category === "deception_triggered") ? 88 : 72,
        ]),
      ),
      status: "warning",
      controls: ["SIEM", "Telemetry", "Deception", "Anomaly detection"],
      gaps: ["Visibility gap olayları halen manual akışla geliyor."],
      improvements: ["Streaming ingestion ve log health monitoring eklenmeli."],
    },
    {
      id: "respond",
      name: "Respond",
      score: Math.round(
        average([
          pct(containedEvents.length, environment.events.length),
          environment.events.some((event) => event.timeline.length > 1) ? 84 : 68,
          78,
        ]),
      ),
      status: "warning",
      controls: ["SOAR", "Playbooks", "Containment", "Ticketing"],
      gaps: ["Gerçek sistem entegrasyonları henüz hazırlık seviyesinde."],
      improvements: ["IAM revoke ve ticketing API entegrasyonları eklenmeli."],
    },
    {
      id: "recover",
      name: "Recover",
      score: Math.round(average([backupCoverage, realAssets.some((asset) => asset.location === "backup") ? 82 : 60, 74])),
      status: "warning",
      controls: ["Backup", "Cold archive", "Recovery procedures"],
      gaps: ["Restore başarım metriği ve immutable backup görünürlüğü eksik."],
      improvements: ["Recover drills ve immutable backup coverage metriklenmeli."],
    },
  ];

  return scores.map((item) => ({
    ...item,
    status: statusFromScore(item.score),
  }));
}

export function getComplianceFindings(environment: Omit<DemoEnvironment, "compliance">) {
  const privacy = calculateKvkkGdprStatus(environment.assets);
  const findings: string[] = [];

  if (privacy.overseasTransferRisk > 0) findings.push("Yurt dışı aktarım riski taşıyan varlıklar izlenmeli.");
  if (privacy.encryptedCoverage < 85) findings.push("Kişisel veri varlıklarında encryption coverage artırılmalı.");
  if (environment.events.some((event) => event.category === "visibility_gap")) findings.push("Detect işlevinde telemetri boşlukları var.");
  if (environment.events.some((event) => event.category === "deception_triggered")) findings.push("Active defense katmanı gerçekçi alarm üretiyor.");

  return findings;
}

export function getComplianceRecommendations(environment: Omit<DemoEnvironment, "compliance">) {
  const recommendations: string[] = [];
  const privacy = calculateKvkkGdprStatus(environment.assets);

  if (privacy.retentionCoverage < 90) recommendations.push("Saklama süresi belirsiz varlıklar raporlanmalı.");
  if (privacy.anonymizationCoverage < 75) recommendations.push("Anonimleştirme ve secure deletion akışları tamamlanmalı.");
  if (environment.identities.some((identity) => !identity.mfaEnabled)) recommendations.push("MFA kapsamı tüm ayrıcalıklı kimliklerde zorunlu olmalı.");
  if (environment.events.filter((event) => event.status === "open" && event.severity === "critical").length > 0) {
    recommendations.push("Açık kritik olaylar için containment SLA güçlendirilmeli.");
  }

  return recommendations;
}

export function calculateComplianceSnapshot(environment: Omit<DemoEnvironment, "compliance">): ComplianceSnapshot {
  const nist = calculateNistCsfScores(environment);
  const privacy = calculateKvkkGdprStatus(environment.assets);
  const overallScore = Math.round(average(nist.map((item) => item.score)));
  const iso27001Score = Math.round(average([overallScore, privacy.encryptedCoverage, privacy.retentionCoverage]));

  const matrix: ComplianceMatrixRow[] = [
    { id: "cm-1", label: "Veri sınıflandırma", kvkk: "implemented", gdpr: "implemented", iso27001: "implemented", nist: "implemented" },
    { id: "cm-2", label: "Erişim logları", kvkk: "partial", gdpr: "partial", iso27001: "implemented", nist: environment.events.some((event) => event.category === "visibility_gap") ? "partial" : "implemented" },
    { id: "cm-3", label: "Şifreleme", kvkk: privacy.encryptedCoverage >= 85 ? "implemented" : "partial", gdpr: privacy.encryptedCoverage >= 85 ? "implemented" : "partial", iso27001: "implemented", nist: "implemented" },
    { id: "cm-4", label: "Saklama süresi", kvkk: privacy.retentionCoverage >= 85 ? "implemented" : "partial", gdpr: privacy.retentionCoverage >= 85 ? "implemented" : "partial", iso27001: "implemented", nist: "partial" },
    { id: "cm-5", label: "Güvenli imha", kvkk: privacy.anonymizationCoverage >= 75 ? "implemented" : "partial", gdpr: privacy.anonymizationCoverage >= 75 ? "implemented" : "partial", iso27001: "partial", nist: "partial" },
    { id: "cm-6", label: "Yurt dışı aktarım kontrolü", kvkk: privacy.overseasTransferRisk ? "partial" : "implemented", gdpr: privacy.overseasTransferRisk ? "partial" : "implemented", iso27001: "partial", nist: "partial" },
    { id: "cm-7", label: "Olay müdahalesi", kvkk: "implemented", gdpr: "implemented", iso27001: "implemented", nist: "implemented" },
  ];

  return {
    overallScore,
    iso27001Score,
    kvkkScore: privacy.kvkkScore,
    gdprScore: privacy.gdprScore,
    nist,
    indicators: [
      {
        label: "Kişisel veri varlıkları",
        value: `${privacy.personalAssets} varlık regülasyon kapsamında`,
        status: privacy.personalAssets > 0 ? "warning" : "healthy",
      },
      {
        label: "Yurt dışı aktarım riski",
        value: `${privacy.overseasTransferRisk} varlık inceleme gerektiriyor`,
        status: privacy.overseasTransferRisk > 0 ? "critical" : "healthy",
      },
      {
        label: "Saklama süresi durumu",
        value: `%${privacy.retentionCoverage} kapsama`,
        status: statusFromScore(privacy.retentionCoverage),
      },
      {
        label: "Anonimleştirme durumu",
        value: `%${privacy.anonymizationCoverage} kapsama`,
        status: statusFromScore(privacy.anonymizationCoverage),
      },
      {
        label: "Erişim log görünürlüğü",
        value: `${environment.events.length} olay üzerinden izleniyor`,
        status: environment.events.some((event) => event.category === "visibility_gap") ? "warning" : "healthy",
      },
    ],
    matrix,
  };
}
