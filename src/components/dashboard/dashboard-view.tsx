"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/database/data-table";
import { ActionButton } from "@/components/ui/action-button";
import { AvatarToken } from "@/components/ui/avatar-token";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { RelationPill } from "@/components/ui/relation-pill";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  classificationLabel,
  formatDateTime,
  locationLabel,
  requestStatusTone,
} from "@/lib/utils";

export function DashboardView() {
  const {
    dashboard,
    environment,
    nextDemoStep,
    previousDemoStep,
    startDemoScenario,
    lastSimulationResult,
  } = useDemo();

  const currentDemoStep = environment.demoScenario.steps[environment.demoScenario.currentStep];
  const pendingRequests = environment.accessRequests.filter((request) => request.status === "pending").length;
  const highRiskAssets = environment.assets.filter(
    (asset) => !asset.isDeception && ["high", "critical"].includes(asset.risk.level),
  ).length;
  const recentEvents = environment.events.slice(0, 6);
  const topAssets = dashboard.topAssets.slice(0, 6);

  const nistSnapshot = useMemo(
    () =>
      environment.compliance.nist.map((item) => ({
        id: item.id,
        name: item.name,
        score: item.score,
        status: item.status,
        topGap: item.gaps[0] ?? "Belirgin boşluk gözlenmedi.",
      })),
    [environment.compliance.nist],
  );

  return (
    <div className="space-y-4">
      <div className="px-1">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Security Overview
            </p>
            <h1 className="mt-1 text-balance text-[20px] font-semibold text-[var(--text-primary)]">
              Hibrit bulut güvenlik durumu
            </h1>
            <p className="mt-1 text-pretty text-[13px] leading-6 text-[var(--text-secondary)]">
              Güvenlik skoru, olay yoğunluğu, yüksek riskli veri varlıkları ve demo akışı tek görünümde sunulur.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={previousDemoStep}>
              Geri
            </ActionButton>
            <ActionButton variant="secondary" onClick={nextDemoStep}>
              İleri
            </ActionButton>
            <ActionButton onClick={startDemoScenario}>Demo Senaryosu Başlat</ActionButton>
          </div>
        </div>
      </div>

      <Panel className="overflow-hidden rounded-[14px] p-0">
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-6">
          <div className="bg-[var(--surface)] p-3"><MetricCard label="Security Score" value={`${dashboard.securityScore}/100`} tone="info" /></div>
          <div className="bg-[var(--surface)] p-3"><MetricCard label="Critical Events" value={dashboard.activeIncidentCount} tone="critical" /></div>
          <div className="bg-[var(--surface)] p-3"><MetricCard label="High Risk Assets" value={highRiskAssets} tone="high" /></div>
          <div className="bg-[var(--surface)] p-3"><MetricCard label="Pending Requests" value={pendingRequests} tone="medium" /></div>
          <div className="bg-[var(--surface)] p-3"><MetricCard label="Deception Triggers" value={dashboard.deceptionAlarmCount} tone="deception" /></div>
          <div className="bg-[var(--surface)] p-3"><MetricCard label="Compliance Score" value={`${dashboard.complianceScore}%`} tone="compliance" /></div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.28fr,0.92fr]">
        <Panel className="overflow-hidden rounded-[14px] p-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 lg:px-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Son Güvenlik Olayları</h2>
              <p className="text-sm text-[var(--text-muted)]">SIEM / SOAR merkezine düşen en güncel olaylar</p>
            </div>
            <Link href="/events" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
              Tüm olaylar
            </Link>
          </div>

          <DataTable className="min-w-[980px]">
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeader className="w-[32%]">Event</DataTableHeader>
                <DataTableHeader className="w-[11%]">Severity</DataTableHeader>
                <DataTableHeader className="w-[15%]">Category</DataTableHeader>
                <DataTableHeader className="w-[14%]">Source</DataTableHeader>
                <DataTableHeader className="w-[14%]">Target</DataTableHeader>
                <DataTableHeader className="w-[14%]">Time</DataTableHeader>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {recentEvents.map((event) => (
                <DataTableRow key={event.id}>
                  <DataTableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-[var(--text-primary)]">{event.title}</span>
                        <StatusBadge label={event.status} tone="neutral" />
                      </div>
                      <p className="line-clamp-1 text-xs text-[var(--text-muted)]">{event.description}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <SeverityBadge severity={event.severity} />
                  </DataTableCell>
                  <DataTableCell>
                    <RelationPill
                      label={event.category}
                      tone={event.category === "deception_triggered" ? "deception" : "info"}
                    />
                  </DataTableCell>
                  <DataTableCell className="text-sm text-[var(--text-primary)]">{event.source}</DataTableCell>
                  <DataTableCell className="text-sm text-[var(--text-secondary)]">{event.target}</DataTableCell>
                  <DataTableCell className="font-mono text-xs text-[var(--text-muted)]">
                    {formatDateTime(event.timestamp)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Panel>

        <Panel className="overflow-hidden rounded-[14px] p-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 lg:px-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">En Riskli Veri Varlıkları</h2>
              <p className="text-sm text-[var(--text-muted)]">Sınıflandırma, şifreleme ve erişim yoğunluğu etkisi</p>
            </div>
            <Link href="/data-assets" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
              Envanteri aç
            </Link>
          </div>

          <DataTable className="min-w-full table-fixed">
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeader className="w-[35%]">Asset</DataTableHeader>
                <DataTableHeader className="w-[15%]">Risk</DataTableHeader>
                <DataTableHeader className="w-[16%]">Location</DataTableHeader>
                <DataTableHeader className="w-[11%]">Access</DataTableHeader>
                <DataTableHeader className="w-[23%]">Owner</DataTableHeader>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {topAssets.map((asset) => (
                <DataTableRow key={asset.id}>
                  <DataTableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-[var(--text-primary)]">{asset.name}</span>
                        <RelationPill label={classificationLabel(asset.classification)} tone="policy" />
                      </div>
                      <p className="line-clamp-1 text-xs text-[var(--text-muted)]">{asset.path}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={asset.risk.level} />
                      <span className="font-mono text-xs text-slate-500">{asset.risk.score}/100</span>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-sm text-[var(--text-secondary)]">{locationLabel(asset.location)}</DataTableCell>
                  <DataTableCell className="font-mono text-xs text-[var(--text-muted)]">{asset.accessCount24h}/24h</DataTableCell>
                  <DataTableCell>
                    <AvatarToken label={asset.owner} subtitle={asset.storageType} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.96fr,1.04fr]">
        <Panel className="overflow-hidden rounded-[14px] p-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 lg:px-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">NIST CSF 2.0 Fonksiyonları</h2>
              <p className="text-sm text-[var(--text-muted)]">Govern, Identify, Protect, Detect, Respond, Recover</p>
            </div>
            <Link href="/compliance" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
              Uyum görünümü
            </Link>
          </div>

          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-3">
            {nistSnapshot.map((item) => (
              <div key={item.id} className="bg-[var(--surface)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                  <StatusBadge
                    label={`${item.score}%`}
                    tone={item.status === "critical" ? "critical" : item.status === "warning" ? "medium" : "low"}
                  />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-elevated)_75%,transparent)]">
                  <div
                    className={`h-full rounded-full ${
                      item.status === "critical"
                        ? "bg-rose-400"
                        : item.status === "warning"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.topGap}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="overflow-hidden rounded-[14px] p-0">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 lg:px-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Demo Senaryo Akışı</h2>
              <p className="text-sm text-[var(--text-muted)]">Access Request → Zero Trust → SIEM → Deception → Report</p>
            </div>
            <StatusBadge
              label={environment.demoScenario.active ? "aktif demo" : "hazır"}
              tone={environment.demoScenario.active ? "deception" : "info"}
            />
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="border-b border-[var(--border)] px-4 py-4 lg:border-b-0 lg:border-r lg:border-[var(--border)] lg:px-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusBadge label={`Adım ${environment.demoScenario.currentStep + 1}`} tone="policy" />
                  <StatusBadge
                    label={currentDemoStep?.status ?? "pending"}
                    tone={requestStatusTone(
                      currentDemoStep?.status === "completed"
                        ? "approved"
                        : currentDemoStep?.status === "active"
                          ? "pending"
                          : "step_up",
                    )}
                  />
                </div>
                <h3 className="text-balance text-lg font-semibold text-[var(--text-primary)]">{currentDemoStep?.title}</h3>
                <p className="text-pretty text-sm leading-6 text-[var(--text-secondary)]">{currentDemoStep?.description}</p>
              </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton variant="secondary" onClick={previousDemoStep}>
                Geri
                </ActionButton>
                <ActionButton variant="secondary" onClick={nextDemoStep}>
                  İleri
                </ActionButton>
                <ActionButton onClick={startDemoScenario}>Baştan Başlat</ActionButton>
              </div>

              {lastSimulationResult ? (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Son simülasyon etkisi</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
                </div>
              ) : null}
            </div>

            <div className="divide-y divide-[var(--border)]">
              {environment.demoScenario.steps.map((step, index) => (
                <div key={step.id} className="px-4 py-3 lg:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{step.description}</p>
                    </div>
                    <StatusBadge
                      label={step.status}
                      tone={
                        step.status === "completed"
                          ? "low"
                          : step.status === "active"
                            ? "policy"
                            : "neutral"
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
