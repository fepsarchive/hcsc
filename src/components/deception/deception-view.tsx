"use client";

import { useMemo } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { RelationPill } from "@/components/ui/relation-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";

export function DeceptionView() {
  const {
    environment,
    createDeceptionStorage,
    triggerDeception,
    runPlaybook,
    selectedDeceptionAsset,
    setSelectedDeceptionAsset,
    lastSimulationResult,
  } = useDemo();

  const latestDeceptionEvent = useMemo(
    () => environment.events.find((event) => event.category === "deception_triggered"),
    [environment.events],
  );
  const selected = selectedDeceptionAsset;

  return (
    <div className="space-y-4">
      <Panel>
        <PageIntro
          eyebrow="MITRE Engage"
          title="Deception / Sahte Depolama Alanları"
          description="Bu sayfa, gerçek veri içermeyen deception varlıklarını, lure skorlarını, adversary engagement görünümünü ve aktif savunma alarm akışlarını daha kurumsal bir database konsolu diliyle sunar."
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={createDeceptionStorage}>Sahte depolama oluştur</Button>
          <Button variant="secondary" onClick={() => triggerDeception()}>
            Erişim simüle et
          </Button>
          <Button variant="secondary" onClick={() => triggerDeception("dec-1", "id-vendor-api")}>
            Deception alarmı üret
          </Button>
          {latestDeceptionEvent ? (
            <Button variant="secondary" onClick={() => runPlaybook(latestDeceptionEvent.id, "isolate_identity")}>
              İzolasyon playbook&apos;u çalıştır
            </Button>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Sahte Veritabanı Tuzak Senaryosu
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">legacy-customer-db-shadow</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Bu senaryo, saldırganın gerçek veri içermeyen ancak gerçekçi görünen bir sahte veritabanına erişmeye çalışması durumunda sistemin erken uyarı üretmesini simüle eder.
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
              Bu kaynak gerçek veri içermez. Tez kapsamında aktif savunma/deception yaklaşımını göstermek için tasarlanmış güvenli bir simülasyondur.
            </p>
          </div>
          <Button onClick={() => triggerDeception("dec-9", "id-legacy-token")}>
            Sahte Veritabanı Erişimini Simüle Et
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Panel className="p-0">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Deception varlıkları</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Kartlar lure score, trigger count ve mapped threat alanlarını tek bakışta görünür kılar.
            </p>
          </div>
          <div className="grid gap-px bg-[var(--border)] lg:grid-cols-2">
            {environment.deceptions.map((deception) => (
              <button
                key={deception.id}
                onClick={() => setSelectedDeceptionAsset(deception.id)}
                className="flex min-h-[272px] flex-col justify-between bg-[var(--surface)] p-5 text-left transition hover:bg-[var(--surface-elevated)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{deception.name}</p>
                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{deception.description}</p>
                    </div>
                    <StatusBadge
                      label={deception.status}
                      tone={deception.status === "triggered" ? "critical" : "deception"}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <MetricField label="Real Data" value="Hayır" />
                    <MetricField label="Fake Type" value={deception.fakeType ?? "storage"} />
                    <MetricField label="Lure Score" value={String(deception.lureScore)} />
                    <MetricField label="Trigger Count" value={String(deception.triggerCount)} />
                    <MetricField label="Mapped Threat" value={deception.mappedThreat} />
                  </div>
                </div>

                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    Önerilen yanıt: {deception.recommendedResponse}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-0">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Son deception alarmı</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Tetiklenen trap ile kimlik davranışlarının korele görünümü
            </p>
          </div>

          <div className="p-5">
            {latestDeceptionEvent ? (
              <div className="rounded-2xl border border-rose-500/16 bg-rose-500/[0.05] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">{latestDeceptionEvent.title}</p>
                  <Badge label={latestDeceptionEvent.severity} tone="critical" />
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{latestDeceptionEvent.description}</p>
                <p className="mt-4 text-sm text-[var(--text-muted)]">
                  Target: {latestDeceptionEvent.target} • {formatDateTime(latestDeceptionEvent.timestamp)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestDeceptionEvent.playbookActions.map((action) => (
                    <Badge key={action} label={action} tone="info" />
                  ))}
                </div>
              </div>
            ) : null}

            {lastSimulationResult ? (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Son simülasyon etkisi</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              {environment.identities
                .filter((identity) => identity.status === "suspicious" || identity.status === "isolated")
                .map((identity) => (
                  <div key={identity.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--text-primary)]">{identity.name}</p>
                      <Badge
                        label={identity.status}
                        tone={identity.status === "isolated" ? "critical" : "high"}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{identity.notes[0]}</p>
                  </div>
                ))}
            </div>
          </div>
        </Panel>
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedDeceptionAsset(null)}
        title={selected?.name ?? "Deception detail"}
        subtitle="Sahte depolama varlığı için aktif savunma detayları"
        badge={
          selected ? (
            <StatusBadge label={selected.status} tone={selected.status === "triggered" ? "critical" : "deception"} />
          ) : undefined
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {selected.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <MetricField label="Contains Real Data" value={selected.containsRealData ? "Evet" : "Hayır"} />
              <MetricField label="Fake Type" value={selected.fakeType ?? "storage"} />
              <MetricField label="Lure Score" value={String(selected.lureScore)} />
              <MetricField label="Trigger Count" value={String(selected.triggerCount)} />
              <MetricField label="Last Triggered" value={selected.lastTriggeredAt ? formatDateTime(selected.lastTriggeredAt) : "Henüz yok"} />
              <MetricField label="Mapped Threat" value={selected.mappedThreat} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Auto Actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.autoActions.map((action) => (
                  <RelationPill key={action} label={action} tone="deception" />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Recommended Response</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{selected.recommendedResponse}</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function MetricField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-[15px] font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
