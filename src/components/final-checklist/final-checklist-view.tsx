"use client";

import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";

export function FinalChecklistView() {
  const { environment, complianceScores, lastSimulationResult } = useDemo();
  const hasClassifiedAssets = environment.assets.some((asset) => asset.classification !== "public");
  const hasZeroTrustDecisions = environment.accessRequests.some((request) => request.status !== "pending");
  const hasDeceptionTrigger = environment.events.some((event) => event.category === "deception_triggered");
  const hasSoarExecution = environment.events.some((event) =>
    event.timeline.some((entry) => entry.message.toLowerCase().includes("playbook")),
  );
  const hasReports = environment.reports.length > 0;
  const checklist = [
    { label: "Veri sınıflandırma var", status: hasClassifiedAssets ? "completed" : "missing", note: `${environment.assets.length} veri varlığı envanterde.` },
    { label: "Zero Trust karar motoru var", status: hasZeroTrustDecisions ? "completed" : "partial", note: `${environment.accessRequests.length} erişim talebi değerlendirilebilir.` },
    { label: "IAM/MFA/RBAC/ABAC simülasyonu var", status: environment.simulations.length >= 4 ? "completed" : "partial", note: `${environment.simulations.length} senaryo yüklü.` },
    { label: "Deception storage var", status: environment.deceptions.length > 0 && hasDeceptionTrigger ? "completed" : environment.deceptions.length > 0 ? "partial" : "missing", note: hasDeceptionTrigger ? `${environment.deceptions.length} deception varlığı aktif alarm üretti.` : `${environment.deceptions.length} deception varlığı tanımlı.` },
    { label: "SIEM/SOAR olay yönetimi var", status: environment.events.length > 0 && hasSoarExecution ? "completed" : environment.events.length > 0 ? "partial" : "missing", note: hasSoarExecution ? "Olay listesi ve playbook zaman çizelgesi mevcut." : `${environment.events.length} olay state içinde mevcut.` },
    { label: "NIST CSF uyum görünümü var", status: complianceScores.nist.length === 6 ? "completed" : "partial", note: `Toplam skor ${complianceScores.overallScore}%.` },
    { label: "KVKK/GDPR görünümü var", status: complianceScores.kvkkScore > 0 && complianceScores.gdprScore > 0 ? "completed" : "partial", note: `KVKK ${complianceScores.kvkkScore}% / GDPR ${complianceScores.gdprScore}%.` },
    { label: "Tehdit-kontrol matrisi var", status: environment.threatMatrix.length > 0 ? "completed" : "missing", note: `${environment.threatMatrix.length} matrix hücresi mevcut.` },
    { label: "Demo senaryoları var", status: environment.demoScenario.steps.length > 0 ? "completed" : "missing", note: `${environment.demoScenario.steps.length} demo adımı yüklü.` },
    { label: "Raporlama var", status: hasReports ? "completed" : "missing", note: `${environment.reports.length} rapor üretildi.` },
    { label: "Sunum modu var", status: lastSimulationResult || environment.demoScenario.active ? "completed" : "partial", note: "Presentation Mode demo state’ini okuyabiliyor." },
    { label: "Responsive UI var", status: "completed", note: "Dashboard-01 tabanlı shell tüm sayfalarda ortak." },
  ] as const;

  return (
    <Panel>
      <PageIntro
        eyebrow="Final Validation"
        title="Final Checklist"
        description="Bu sayfa, tez çözüm gereksinimlerinin sistem üzerinde karşılanıp karşılanmadığını hızlıca göstermesi için tasarlandı."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {checklist.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[var(--text-primary)]">{item.label}</p>
              <Badge
                label={item.status === "completed" ? "completed" : item.status === "partial" ? "partial" : "missing"}
                tone={item.status === "completed" ? "low" : item.status === "partial" ? "medium" : "critical"}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.note}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
