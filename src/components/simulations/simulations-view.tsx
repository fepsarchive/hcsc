"use client";

import Link from "next/link";
import { useDemo } from "@/components/layout/demo-provider";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/utils";

export function SimulationsView() {
  const { environment, runSimulation, lastSimulationResult, startDemoScenario, runExecutiveDemo, resetDemoData } = useDemo();
  const currentDemoStep = environment.demoScenario.steps[environment.demoScenario.currentStep];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
      <Panel>
        <PageIntro
          eyebrow="Scenario Center"
          title="Senaryo Çalıştırma Merkezi"
          description="Bu sayfa, güvenli operasyon senaryolarıyla risk skorlarını, olay üretimini, önerilen aksiyonları ve çapraz modül güncellemelerini tetikler."
          action={{ label: "Guided Run Başlat", onClick: () => void runExecutiveDemo() }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton variant="secondary" onClick={() => void runExecutiveDemo()}>
            Guided Run Başlat
          </ActionButton>
          <ActionButton variant="ghost" onClick={startDemoScenario}>
            Executive Briefing Akışını Başlat
          </ActionButton>
          <ActionButton variant="ghost" onClick={resetDemoData}>
            Çalışma verisini yenile
          </ActionButton>
          <Link
            href="/presentation"
            className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--surface)_86%,white_5%)] hover:text-[var(--text-primary)]"
          >
            Executive Briefing
          </Link>
        </div>

        <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Operasyon akışı durumu</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {currentDemoStep?.title}: {currentDemoStep?.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                label={environment.demoScenario.active ? "aktif akış" : "hazır"}
                tone={environment.demoScenario.active ? "deception" : "neutral"}
              />
              <Badge label={`Adım ${environment.demoScenario.currentStep + 1}`} tone="policy" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {environment.simulations.map((simulation) => (
            <div key={simulation.id} className="flex min-h-[260px] flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{simulation.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{simulation.description}</p>
                </div>
                <Badge label={simulation.riskLevel ?? "scenario"} tone={simulation.riskLevel === "critical" ? "critical" : simulation.riskLevel === "high" ? "high" : simulation.riskLevel === "medium" ? "medium" : "info"} />
              </div>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Beklenen çıktı: {simulation.expectedOutcome}
              </p>
              {simulation.affectedModules?.length ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Etkilenen modüller: {simulation.affectedModules.join(", ")}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {simulation.relatedControls.map((control) => (
                  <Badge key={control} label={control} tone="neutral" />
                ))}
              </div>
              <ActionButton className="mt-auto self-start" onClick={() => runSimulation(simulation.id)}>
                Senaryoyu Çalıştır
              </ActionButton>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Son çalıştırma çıktıları</h2>
        {lastSimulationResult ? (
          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-semibold text-[var(--text-primary)]">Aktif sonuç özeti</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {formatDateTime(lastSimulationResult.createdAt)}
            </p>
            {lastSimulationResult.affectedModules?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {lastSimulationResult.affectedModules.map((module) => (
                  <Badge key={module} label={module} tone="info" />
                ))}
              </div>
            ) : null}
            {lastSimulationResult.generatedEventIds?.length ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Üretilen olay sayısı: {lastSimulationResult.generatedEventIds.length}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 space-y-3">
          {environment.runs.slice(0, 10).map((run) => (
            <div key={run.id} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-semibold text-[var(--text-primary)]">
                {environment.simulations.find((simulation) => simulation.id === run.scenarioId)?.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{run.summary}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {formatDateTime(run.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
