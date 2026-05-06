"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { ActionButton } from "@/components/ui/action-button";
import { buildReportMarkdown } from "@/lib/report-engine";
import { formatDateTime } from "@/lib/utils";

const reportToneMap = {
  general: "info",
  "critical-data": "critical",
  "zero-trust": "policy",
  deception: "deception",
  nist: "compliance",
  privacy: "info",
  demo: "deception",
} as const;

export function ReportsView() {
  const router = useRouter();
  const { environment, generateReport, lastSimulationResult } = useDemo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = environment.reports.find((report) => report.id === selectedId) ?? null;

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="space-y-4">
      <Panel>
        <PageIntro
          eyebrow="Reporting"
          title="Raporlar"
          description="Bu sayfa, tez sunumu için güvenlik, Zero Trust, deception, NIST CSF 2.0 ve KVKK/GDPR perspektiflerini rapor kartları ve detay drawer yapısıyla sunar."
          action={{ label: "Raporları yenile", onClick: () => generateReport() }}
        />
      </Panel>

      {environment.reports.length === 0 ? (
        <Panel>
          <EmptyState
            title="Henüz rapor üretilmedi"
            description="Demo senaryosu çalıştırarak veya raporları yenileyerek güvenlik konsolu için yeni çıktı üretebilirsin."
            primaryAction={<ActionButton onClick={() => generateReport()}>Raporları oluştur</ActionButton>}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {environment.reports.map((report) => (
            <Panel key={report.id} className="flex min-h-[250px] flex-col justify-between p-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-balance text-[15px] font-semibold text-[var(--text-primary)]">{report.title}</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">{formatDateTime(report.createdAt)}</p>
                  </div>
                  <Badge label={report.type} tone={reportToneMap[report.type]} />
                </div>

                <p className="mt-5 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{report.summary}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton variant="secondary" onClick={() => setSelectedId(report.id)}>
                  Aç
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => generateReport(report.type)}>
                  Yeniden üret
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => copyText(report.summary)}>
                  Copy Summary
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => copyText(buildReportMarkdown(report, environment))}>
                  Copy Markdown
                </ActionButton>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.title ?? "Rapor detayı"}
        subtitle={selected ? formatDateTime(selected.createdAt) : undefined}
        badge={selected ? <Badge label={selected.type} tone={reportToneMap[selected.type]} /> : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="secondary" onClick={() => copyText(selected.summary)}>
                Copy Summary
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => copyText(buildReportMarkdown(selected, environment))}>
                Copy Markdown
              </ActionButton>
              <ActionButton onClick={() => router.push(`/reports/${selected.id}/print`)}>Yazdır / PDF</ActionButton>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Yönetici özeti</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{selected.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Related Events</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selected.relatedEventIds.length}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Controls</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selected.relatedControls.length}</p>
              </div>
            </div>

            {lastSimulationResult && selected.type === "demo" ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Son demo akışı</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
              </div>
            ) : null}

            <SectionList title="Bulgular" items={selected.findings} />
            <SectionList title="Riskler" items={selected.risks} />
            <SectionList title="Önerilen aksiyonlar" items={selected.recommendedActions} />

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">İlgili kontroller</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.relatedControls.map((control) => (
                  <Badge key={control} label={control} tone="info" />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
