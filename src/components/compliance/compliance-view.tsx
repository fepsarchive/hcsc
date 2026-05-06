"use client";

import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";

const coverageColors = {
  implemented: "bg-emerald-500/20 text-emerald-200",
  partial: "bg-amber-500/20 text-amber-200",
  missing: "bg-rose-500/20 text-rose-200",
  not_applicable: "bg-slate-500/20 text-slate-300",
};

export function ComplianceView() {
  const { environment, complianceScores, updateComplianceScores, lastSimulationResult } = useDemo();
  const { compliance } = environment;

  return (
    <div className="space-y-5">
      <Panel>
        <PageIntro
          eyebrow="NIST / ISO / KVKK / GDPR"
          title="Uyumluluk"
          description="Bu sayfa, NIST CSF 2.0 fonksiyonlarını, ISO 27001 görünürlüğünü ve KVKK/GDPR veri yönetimi kontrollerini tek bir uyumluluk katmanında toplar."
          action={{ label: "Skorları yeniden hesapla", onClick: updateComplianceScores }}
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            ["NIST Genel", `${complianceScores.overallScore}%`],
            ["ISO 27001", `${complianceScores.iso27001Score}%`],
            ["KVKK", `${complianceScores.kvkkScore}%`],
            ["GDPR", `${complianceScores.gdprScore}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
              <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
        {lastSimulationResult ? (
          <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Son simülasyon etkisi</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">NIST CSF 2.0 kartları</h2>
          <div className="mt-5 space-y-4">
            {compliance.nist.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                  <Badge label={`${item.score}%`} tone={item.status === "healthy" ? "low" : item.status === "warning" ? "medium" : "critical"} />
                </div>
                <ProgressBar value={item.score} tone={item.status === "healthy" ? "emerald" : item.status === "warning" ? "amber" : "rose"} />
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Kontroller</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.controls.map((control) => <li key={control}>• {control}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Eksikler</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.gaps.map((gap) => <li key={gap}>• {gap}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Önerilen iyileştirme</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.improvements.map((improvement) => <li key={improvement}>• {improvement}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">KVKK / GDPR göstergeleri</h2>
          <div className="mt-5 space-y-3">
            {compliance.indicators.map((indicator) => (
              <div key={indicator.label} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--text-primary)]">{indicator.label}</p>
                  <Badge label={indicator.status} tone={indicator.status === "healthy" ? "low" : indicator.status === "warning" ? "medium" : "critical"} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{indicator.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Uyumluluk matrisi</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-2 text-sm">
            <thead>
              <tr>
                <th className="text-left text-[var(--text-muted)]">Kontrol alanı</th>
                <th className="text-left text-[var(--text-muted)]">KVKK</th>
                <th className="text-left text-[var(--text-muted)]">GDPR</th>
                <th className="text-left text-[var(--text-muted)]">ISO 27001</th>
                <th className="text-left text-[var(--text-muted)]">NIST CSF</th>
              </tr>
            </thead>
            <tbody>
              {compliance.matrix.map((row) => (
                <tr key={row.id}>
                  <td className="rounded-2xl bg-[var(--surface)] p-3 font-semibold text-[var(--text-primary)]">{row.label}</td>
                  {([row.kvkk, row.gdpr, row.iso27001, row.nist] as const).map((value, index) => (
                    <td key={`${row.id}-${index}`} className="p-1">
                      <div className={`rounded-2xl px-3 py-3 text-center font-semibold ${coverageColors[value]}`}>
                        {value}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Önerilen uyumluluk aksiyonları</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {compliance.nist.flatMap((item) => item.improvements).slice(0, 6).map((recommendation) => (
            <div key={recommendation} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
              {recommendation}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
