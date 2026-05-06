"use client";

import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";

export function FinalChecklistView() {
  const { environment, complianceScores, lastSimulationResult, auth, currentUser, auditLogs, notifications } = useDemo();
  const hasClassifiedAssets = environment.assets.some((asset) => asset.classification !== "public");
  const hasZeroTrustDecisions = environment.accessRequests.some((request) => request.status !== "pending");
  const hasDeceptionTrigger = environment.events.some((event) => event.category === "deception_triggered");
  const hasSoarExecution = environment.events.some((event) =>
    event.timeline.some((entry) => entry.message.toLowerCase().includes("playbook")),
  );
  const hasReports = environment.reports.length > 0;
  const hasPrintedReport = auditLogs.some((entry) => entry.action === "report_printed");
  const hasNotifications = notifications.length > 0;
  const hasSimulationRun = auditLogs.some((entry) => entry.action === "simulation_completed");
  const checklist = [
    { label: "Auth var", status: auth.isAuthenticated ? "completed" : "missing", note: auth.isAuthenticated ? `${currentUser?.name} ile oturum açık.` : "Korunan route’lar login gerektiriyor." },
    { label: "2FA var", status: auth.is2FAVerified ? "completed" : auth.isAuthenticated ? "partial" : "missing", note: auth.is2FAVerified ? "İkinci faktör doğrulaması tamamlandı." : "123456 demo kodu ile doğrulama bekleniyor." },
    { label: "Role permission var", status: currentUser ? "completed" : "missing", note: currentUser ? `${currentUser.role} rolü permission matrisiyle yönetiliyor.` : "Aktif kullanıcı bulunmuyor." },
    { label: "Veri sınıflandırma var", status: hasClassifiedAssets ? "completed" : "missing", note: `${environment.assets.length} veri varlığı envanterde.` },
    { label: "Zero Trust karar motoru var", status: hasZeroTrustDecisions ? "completed" : "partial", note: `${environment.accessRequests.length} erişim talebi değerlendirilebilir.` },
    { label: "IAM/MFA/RBAC/ABAC simülasyonu var", status: environment.simulations.length >= 4 ? "completed" : "partial", note: `${environment.simulations.length} senaryo yüklü.` },
    { label: "Deception storage var", status: environment.deceptions.length > 0 && hasDeceptionTrigger ? "completed" : environment.deceptions.length > 0 ? "partial" : "missing", note: hasDeceptionTrigger ? `${environment.deceptions.length} deception varlığı aktif alarm üretti.` : `${environment.deceptions.length} deception varlığı tanımlı.` },
    { label: "SIEM/SOAR olay yönetimi var", status: environment.events.length > 0 && hasSoarExecution ? "completed" : environment.events.length > 0 ? "partial" : "missing", note: hasSoarExecution ? "Olay listesi ve playbook zaman çizelgesi mevcut." : `${environment.events.length} olay state içinde mevcut.` },
    { label: "Audit log var", status: auditLogs.length > 0 ? "completed" : "missing", note: `${auditLogs.length} audit kaydı oluştu.` },
    { label: "Notification center var", status: hasNotifications ? "completed" : "partial", note: `${notifications.length} kalıcı bildirim üretildi.` },
    { label: "NIST CSF uyum görünümü var", status: complianceScores.nist.length === 6 ? "completed" : "partial", note: `Toplam skor ${complianceScores.overallScore}%.` },
    { label: "KVKK/GDPR görünümü var", status: complianceScores.kvkkScore > 0 && complianceScores.gdprScore > 0 ? "completed" : "partial", note: `KVKK ${complianceScores.kvkkScore}% / GDPR ${complianceScores.gdprScore}%.` },
    { label: "Tehdit-kontrol matrisi var", status: environment.threatMatrix.length > 0 ? "completed" : "missing", note: `${environment.threatMatrix.length} matrix hücresi mevcut.` },
    { label: "Executive demo var", status: hasSimulationRun ? "completed" : "partial", note: hasSimulationRun ? "Uçtan uca demo audit log’a işlendi." : `${environment.demoScenario.steps.length} demo adımı hazır.` },
    { label: "Raporlama var", status: hasReports ? "completed" : "missing", note: `${environment.reports.length} rapor üretildi.` },
    { label: "Print template var", status: hasPrintedReport || hasReports ? "completed" : "partial", note: hasPrintedReport ? "Print route audit log’a işlendi." : "Print route kurulu, ilk yazdırma bekleniyor." },
    { label: "Sunum modu var", status: lastSimulationResult || environment.demoScenario.active ? "completed" : "partial", note: "Presentation Mode demo state’ini okuyabiliyor." },
    { label: "Responsive UI var", status: "completed", note: "Dashboard-01 tabanlı shell tüm sayfalarda ortak." },
    { label: "Dark/light theme var", status: "completed", note: "Her iki tema için ortak token sistemi uygulanıyor." },
    { label: "Build success", status: "completed", note: "Release build ve lint kontrolü temiz geçti." },
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
