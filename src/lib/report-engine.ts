import { DemoEnvironment, ReportItem, ReportType } from "@/types";
import { buildDashboardSummary, formatDateTime, makeId } from "@/lib/utils";

type ReportEnvironment = Omit<DemoEnvironment, "reports"> & { reports?: ReportItem[] };

function uniqueIds(values: string[]) {
  return [...new Set(values)];
}

function collectRelatedEventIds(
  environment: ReportEnvironment,
  predicate: (event: DemoEnvironment["events"][number]) => boolean,
) {
  return environment.events.filter(predicate).map((event) => event.id).slice(0, 8);
}

function createReport(environment: ReportEnvironment, type: ReportType): ReportItem {
  const now = new Date().toISOString();
  const normalizedEnvironment = {
    ...environment,
    reports: environment.reports ?? [],
  } as DemoEnvironment;
  const dashboard = buildDashboardSummary(normalizedEnvironment);
  const criticalAssets = environment.assets.filter((asset) => !asset.isDeception && asset.risk.level === "critical");
  const highRiskAssets = environment.assets.filter((asset) => !asset.isDeception && ["high", "critical"].includes(asset.risk.level));
  const zeroTrustIssues = environment.accessRequests.filter((request) =>
    ["rejected", "step_up", "isolated"].includes(request.status),
  );
  const deceptionEvents = environment.events.filter((event) => event.category === "deception_triggered");
  const privacyAssets = environment.assets.filter((asset) => asset.kvkkScope || asset.gdprScope);
  const latestRun = environment.runs[0];

  const common = {
    id: makeId("rpt"),
    createdAt: now,
    status: "generated" as const,
  };

  switch (type) {
    case "general":
      return {
        ...common,
        title: "Genel Güvenlik Durumu Raporu",
        type,
        summary: `Genel güvenlik skoru ${dashboard.securityScore}/100; açık kritik olay ${environment.events.filter((event) => event.status !== "resolved" && event.severity === "critical").length}, yüksek riskli varlık ${highRiskAssets.length}.`,
        findings: [
          `${environment.events.length} olay ve ${environment.accessRequests.length} erişim talebi güvenlik konsolunda izleniyor.`,
          `${environment.compliance.overallScore}% NIST CSF olgunluğu ve ${dashboard.deceptionAlarmCount} deception tetiklemesi görünür.`,
        ],
        risks: ["Public cloud hassas veri maruziyeti", "Üçüncü taraf entegrasyon anomalileri", "Açık kritik olayların iş yükü"],
        recommendedActions: ["High risk asset kontrollerini sıkılaştır", "SOAR containment akışlarını hızlandır", "Detect coverage için telemetry boşluklarını kapat"],
        relatedEventIds: environment.events.slice(0, 8).map((event) => event.id),
        relatedAssetIds: highRiskAssets.slice(0, 8).map((asset) => asset.id),
        relatedControls: ["SIEM", "SOAR", "IAM", "Encryption", "Deception"],
      };
    case "critical-data":
      return {
        ...common,
        title: "Kritik Veri Risk Raporu",
        type,
        summary: `${criticalAssets.length} kritik veri varlığı ek denetim ve koruma gerektiriyor.`,
        findings: criticalAssets.slice(0, 8).map((asset) => `${asset.name}: ${asset.risk.reasons[0] ?? "Ek değerlendirme gerekli."}`),
        risks: ["Kritik veri export talepleri", "KMS eksikleri", "Anonimleştirme boşlukları"],
        recommendedActions: ["Kritik veri için MFA ve DLP zorunlu hale getir", "KMS yaşam döngüsünü tamamla", "Retention ve anonymization kontrollerini backend seviyesinde izle"],
        relatedEventIds: collectRelatedEventIds(environment, (event) =>
          ["missing_encryption", "policy_violation", "suspicious_export"].includes(event.category),
        ),
        relatedAssetIds: criticalAssets.map((asset) => asset.id),
        relatedControls: ["KMS", "DLP", "RBAC/ABAC", "Backup"],
      };
    case "zero-trust":
      return {
        ...common,
        title: "Zero Trust Erişim Kararları Raporu",
        type,
        summary: `${zeroTrustIssues.length} talep ek doğrulama, ret veya izolasyon gerektirdi.`,
        findings: zeroTrustIssues.slice(0, 8).map((request) => `${request.identityName} -> ${request.targetAssetName}: ${request.evaluation.decision}`),
        risks: ["MFA olmayan yüksek etkili talepler", "Servis hesabı hacim anomalisi", "Mesai dışı export denemeleri"],
        recommendedActions: ["Step-up auth politikalarını sıkılaştır", "Service account davranış tabanlı izolasyon ekle", "Third-party erişimleri scope bazlı sınırla"],
        relatedEventIds: collectRelatedEventIds(environment, (event) =>
          ["policy_violation", "suspicious_export", "impossible_travel"].includes(event.category),
        ),
        relatedAssetIds: uniqueIds(zeroTrustIssues.map((request) => request.targetAssetId)),
        relatedControls: ["Zero Trust", "IAM", "MFA", "RBAC/ABAC"],
      };
    case "deception":
      return {
        ...common,
        title: "Deception Olayları Raporu",
        type,
        summary: `${deceptionEvents.length} deception olayı aktif savunma katmanında kaydedildi.`,
        findings: deceptionEvents.slice(0, 8).map((event) => `${event.source} -> ${event.target}`),
        risks: ["Credential theft keşif hareketi", "Lateral movement denemeleri", "Service identity kötüye kullanımı"],
        recommendedActions: ["Trigger sonrası isolate_identity aksiyonunu varsayılan yap", "Yeni lure asset tipleri ekle", "Deception korelasyonunu reports katmanına bağla"],
        relatedEventIds: deceptionEvents.map((event) => event.id),
        relatedAssetIds: environment.deceptions.map((deception) => deception.id),
        relatedControls: ["Deception", "SIEM", "SOAR"],
      };
    case "nist":
      return {
        ...common,
        title: "NIST CSF 2.0 Uyum Raporu",
        type,
        summary: `NIST CSF genel skoru ${environment.compliance.overallScore}% seviyesinde hesaplandı.`,
        findings: environment.compliance.nist.map((item) => `${item.name}: ${item.score}%`),
        risks: ["Detect coverage boşlukları", "Respond entegrasyonlarının hazırlık seviyesinde olması"],
        recommendedActions: ["Streaming telemetry ekle", "Playbook aksiyonlarını gerçek API entegrasyonlarına hazırla", "Govern fonksiyonunda policy approval akışı ekle"],
        relatedEventIds: collectRelatedEventIds(environment, (event) =>
          ["visibility_gap", "deception_triggered", "policy_violation"].includes(event.category),
        ),
        relatedAssetIds: [],
        relatedControls: ["Governance", "SIEM", "SOAR", "Encryption"],
      };
    case "privacy":
      return {
        ...common,
        title: "KVKK/GDPR Veri Yönetimi Raporu",
        type,
        summary: `%${environment.compliance.kvkkScore} KVKK ve %${environment.compliance.gdprScore} GDPR görünürlüğü üretildi.`,
        findings: [
          `${privacyAssets.length} veri varlığı kişisel veri veya regülasyon kapsamına giriyor.`,
          `${privacyAssets.filter((asset) => asset.location === "public_cloud" || asset.location === "saas").length} varlık yurt dışı aktarım riski taşıyor.`,
        ],
        risks: ["Cross-border transfer", "Eksik anonimleştirme", "Belirsiz retention kuralı"],
        recommendedActions: ["Anonimleştirme ve secure deletion akışını tamamla", "Saklama süresi politikalarını standardize et", "Third-party veri aktarım kayıtlarını raporla"],
        relatedEventIds: collectRelatedEventIds(environment, (event) =>
          ["third_party_anomaly", "missing_encryption"].includes(event.category),
        ),
        relatedAssetIds: privacyAssets.slice(0, 10).map((asset) => asset.id),
        relatedControls: ["DLP", "CASB", "Secure Deletion", "Encryption"],
      };
    case "demo":
    default:
      return {
        ...common,
        title: "Operasyon Özet Raporu",
        type: "demo",
        summary: latestRun
          ? `Son çalışma özeti: ${latestRun.summary}`
          : "Henüz çalıştırılmış bir operasyon özeti bulunmuyor.",
        findings: environment.demoScenario.steps.map((step, index) => `${index + 1}. ${step.title}`),
        risks: ["Kritik veri export", "Deception access", "SOAR containment gereksinimi"],
        recommendedActions: ["Executive Briefing görünümünde adımları sırayla paylaş", "Raporları güncelleyerek son bulguları yansıt", "Compliance etkisini Respond ve Detect kartlarında vurgula"],
        relatedEventIds: latestRun?.generatedEventIds ?? [],
        relatedAssetIds: [],
        relatedControls: ["Zero Trust", "Deception", "SOAR", "Compliance"],
      };
  }
}

export function buildReportMarkdown(report: ReportItem, environment: ReportEnvironment) {
  const relatedEvents = environment.events.filter((event) => report.relatedEventIds.includes(event.id));
  const relatedAssets = environment.assets.filter((asset) => report.relatedAssetIds?.includes(asset.id));

  return `# ${report.title}

Tarih: ${formatDateTime(report.createdAt)}

## Ozet
${report.summary}

## Bulgular
${report.findings.map((item) => `- ${item}`).join("\n")}

## Riskler
${report.risks.map((item) => `- ${item}`).join("\n")}

## Onerilen Aksiyonlar
${report.recommendedActions.map((item) => `- ${item}`).join("\n")}

## Ilgili Olaylar
${relatedEvents.map((event) => `- ${event.title} (${event.severity})`).join("\n")}

## Ilgili Varliklar
${relatedAssets.map((asset) => `- ${asset.name} (${asset.classification})`).join("\n")}

## Ilgili Kontroller
${report.relatedControls.map((control) => `- ${control}`).join("\n")}
`;
}

export function generateReport(type: ReportType, environment: ReportEnvironment): ReportItem {
  const report = createReport(environment, type);
  return {
    ...report,
    markdownContent: buildReportMarkdown(report, environment),
  };
}

export function generateReports(environment: ReportEnvironment): ReportItem[] {
  const types: ReportType[] = ["general", "critical-data", "zero-trust", "deception", "nist", "privacy", "demo"];
  return types.map((type) => generateReport(type, environment));
}
