"use client";

import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export function PresentationView() {
  const { environment, startDemoScenario, nextDemoStep, previousDemoStep, lastSimulationResult, reports, complianceScores } = useDemo();
  const current = environment.demoScenario.steps[environment.demoScenario.currentStep];
  const latestDemoReport = reports.find((report) => report.type === "demo") ?? reports[0] ?? null;

  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">Presentation Mode</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              Hibrit Bulut Ortamında Veri Depolama ve Yönetimi İçin Aktif Savunma Tabanlı Güvenlik Mimarisi
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Problem: hibrit bulutta veri depolama ve yönetim süreçleri; yanlış yapılandırma, kimlik hırsızlığı, API suistimali, üçüncü taraf riski ve mevzuat yükümlülükleri nedeniyle dağınık bir risk yüzeyi oluşturur.
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Çözüm: veri sınıflandırma, Zero Trust karar motoru, deception storage, SIEM/SOAR olay yönetimi ve NIST CSF tabanlı uyumluluk katmanını tek ürünleştirilmiş konsolda birleştirmek.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              "Önce / Sonra güvenlik durumu görünürlüğü",
              "NIST CSF 2.0 fonksiyon eşleşmesi",
              "MITRE Engage tabanlı deception akışı",
              "Tez katkısının çalışan prototipe dönüşmesi",
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Mimari katmanlar</h2>
          <div className="mt-5 space-y-3">
            {environment.layers.map((layer) => (
              <div key={layer.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--text-primary)]">{layer.name}</p>
                  <Badge label={`${layer.health}%`} tone={layer.health >= 85 ? "low" : layer.health >= 70 ? "medium" : "high"} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{layer.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Demo senaryo akışı</h2>
          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-semibold text-[var(--text-primary)]">{current?.title}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{current?.description}</p>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={previousDemoStep}>Geri</Button>
              <Button variant="secondary" onClick={startDemoScenario}>Sunumu Başlat</Button>
              <Button onClick={nextDemoStep}>İleri</Button>
            </div>
          </div>
          {lastSimulationResult ? (
            <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-semibold text-[var(--text-primary)]">Gerçek demo sonucu</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={`Uyumluluk ${complianceScores.overallScore}%`} tone="compliance" />
                {latestDemoReport ? <Badge label={latestDemoReport.title} tone="deception" /> : null}
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {environment.demoScenario.steps.map((step, index) => (
              <div key={step.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--text-primary)]">{index + 1}. {step.title}</p>
                  <Badge label={step.status} tone={step.status === "completed" ? "low" : step.status === "active" ? "deception" : "neutral"} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Uyumluluk etkisi</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["NIST", `${complianceScores.overallScore}%`],
              ["KVKK", `${complianceScores.kvkkScore}%`],
              ["GDPR", `${complianceScores.gdprScore}%`],
              ["ISO 27001", `${complianceScores.iso27001Score}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Rapor çıktısı</h2>
          {latestDemoReport ? (
            <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--text-primary)]">{latestDemoReport.title}</p>
                <Badge label={latestDemoReport.type} tone="deception" />
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{latestDemoReport.summary}</p>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                İlgili olaylar: {latestDemoReport.relatedEventIds.length} • Kontroller: {latestDemoReport.relatedControls.length}
              </p>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
