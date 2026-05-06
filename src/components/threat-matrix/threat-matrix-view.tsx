"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import { Drawer } from "@/components/ui/drawer";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { RelationPill } from "@/components/ui/relation-pill";
import { ActionButton } from "@/components/ui/action-button";

const toneMap = {
  implemented: "low",
  partial: "medium",
  missing: "critical",
  not_applicable: "neutral",
} as const;

const cellClassMap = {
  implemented:
    "border-emerald-500/18 bg-emerald-500/12 text-emerald-300 dark:text-emerald-200",
  partial:
    "border-amber-500/18 bg-amber-500/12 text-amber-300 dark:text-amber-200",
  missing:
    "border-rose-500/18 bg-rose-500/12 text-rose-300 dark:text-rose-200",
  not_applicable:
    "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
} as const;

export function ThreatMatrixView() {
  const { environment } = useDemo();
  const [selected, setSelected] = useState<{
    threatId: string;
    controlId: string;
  } | null>(null);

  const selectedThreat = environment.threats.find((item) => item.id === selected?.threatId) ?? null;
  const selectedControl = environment.controls.find((item) => item.id === selected?.controlId) ?? null;
  const selectedEntry = selected
    ? environment.threatMatrix.find(
        (item) => item.threatId === selected.threatId && item.controlId === selected.controlId,
      ) ?? null
    : null;

  const coverageSummary = useMemo(() => {
    const counts = {
      implemented: 0,
      partial: 0,
      missing: 0,
      not_applicable: 0,
    };

    environment.threatMatrix.forEach((item) => {
      counts[item.status] += 1;
    });

    return counts;
  }, [environment.threatMatrix]);

  const rowCoverage = useMemo(() => {
    if (!selectedThreat) {
      return [];
    }

    return environment.threatMatrix.filter((item) => item.threatId === selectedThreat.id);
  }, [environment.threatMatrix, selectedThreat]);

  return (
    <div className="space-y-4">
      <Panel>
        <PageIntro
          eyebrow="Control Coverage"
          title="Threat-Control Matrix"
          description="Bu sayfa, tehditler ile güvenlik kontrolleri arasındaki kapsama ilişkisini ürünleşmiş bir matrix görünümünde sunar. Hücreler uygulanıyor, kısmen uygulanıyor, eksik veya uygulanamaz durumlarını gösterir."
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge label={`Implemented ${coverageSummary.implemented}`} tone="low" />
          <StatusBadge label={`Partial ${coverageSummary.partial}`} tone="medium" />
          <StatusBadge label={`Missing ${coverageSummary.missing}`} tone="critical" />
          <StatusBadge label={`N/A ${coverageSummary.not_applicable}`} tone="neutral" />
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Matrix View</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Bir hücreye tıklayarak ilgili tehdit-kontrol kombinasyonunun detaylarını açabilirsin.
          </p>
        </div>

        <div className="hcsc-scrollbar overflow-x-auto">
          <table className="min-w-[1500px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 border-r border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-left text-[15px] font-semibold text-[var(--text-primary)]">
                  Threat
                </th>
                {environment.controls.map((control) => (
                  <th
                    key={control.id}
                    className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left text-[14px] font-medium text-[var(--text-secondary)]"
                  >
                    <span className="block min-w-[120px] text-balance">{control.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {environment.threats.map((threat) => (
                <tr key={threat.id}>
                  <td className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-5 py-4 align-top">
                    <div className="w-[180px] rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4">
                      <p className="text-[15px] font-semibold text-[var(--text-primary)]">{threat.name}</p>
                    </div>
                  </td>
                  {environment.controls.map((control) => {
                    const entry =
                      environment.threatMatrix.find(
                        (item) => item.threatId === threat.id && item.controlId === control.id,
                      ) ?? null;
                    const value = entry?.status ?? "missing";

                    return (
                      <td
                        key={`${threat.id}-${control.id}`}
                        className="border-b border-[var(--border)] px-3 py-3 align-middle"
                      >
                        <button
                          onClick={() => setSelected({ threatId: threat.id, controlId: control.id })}
                          className={`flex min-h-[56px] w-full items-center justify-center rounded-2xl border px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:brightness-110 ${cellClassMap[value]}`}
                        >
                          {value.replaceAll("_", " ")}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Drawer
        open={Boolean(selectedEntry && selectedThreat && selectedControl)}
        onClose={() => setSelected(null)}
        title={selectedThreat && selectedControl ? `${selectedThreat.name} / ${selectedControl.name}` : "Coverage detail"}
        subtitle="Seçili matrix hücresi için güvenlik kapsama değerlendirmesi"
        badge={
          selectedEntry ? (
            <StatusBadge label={selectedEntry.status.replaceAll("_", " ")} tone={toneMap[selectedEntry.status]} />
          ) : undefined
        }
      >
        {selectedEntry && selectedThreat && selectedControl ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{selectedThreat.name}</span> tehdidine karşı{" "}
                <span className="font-semibold text-[var(--text-primary)]">{selectedControl.name}</span> kontrolünün
                mevcut kapsama durumu burada detaylandırılır.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Threat</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selectedThreat.name}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Control</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selectedControl.name}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Coverage</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selectedEntry.status.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Mapped Controls</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{rowCoverage.length}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Önerilen iyileştirme eksenleri</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <RelationPill label={selectedControl.name} tone="policy" />
                <RelationPill label={selectedThreat.name} tone="info" />
                {selectedEntry.status === "implemented" ? (
                  <RelationPill label="Continuous Validation" tone="deception" />
                ) : null}
                {selectedEntry.status !== "implemented" ? (
                  <RelationPill label="Coverage Gap" tone="deception" />
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Değerlendirme notu</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {selectedEntry.status === "implemented"
                  ? "Bu kontrol ilgili tehdit senaryosuna karşı uygulanmış görünüyor. Sonraki adım, operasyonel doğrulama ve olay korelasyonu ile etkinliğin ölçülmesidir."
                  : selectedEntry.status === "partial"
                    ? "Kontrol kısmen uygulanmış durumda. Politika kapsamı, telemetri veya otomasyon eksiklerinin kapatılması önerilir."
                    : selectedEntry.status === "missing"
                      ? "Bu kombinasyonda belirgin bir kapsama boşluğu bulunuyor. Üründe görünür aksiyon, playbook ve politika entegrasyonu ile bu alan güçlendirilmeli."
                      : "Bu kombinasyon mimari olarak uygulanamaz veya kapsam dışı olarak işaretlenmiş durumda."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => setSelected(null)}>Kapat</ActionButton>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
