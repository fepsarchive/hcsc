"use client";

import { useMemo, useState } from "react";
import { DatabaseShell } from "@/components/database/database-shell";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/database/data-table";
import { useDemo } from "@/components/layout/demo-provider";
import { ActionButton } from "@/components/ui/action-button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { RelationPill } from "@/components/ui/relation-pill";
import { SearchInput } from "@/components/ui/search-input";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { filterEvents } from "@/lib/event-engine";
import { formatDateTime, playbookActionLabel } from "@/lib/utils";
import { EventCategory, EventSeverity, EventStatus, SoarAction } from "@/types";

const playbookButtons: SoarAction[] = [
  "require_mfa",
  "revoke_token",
  "isolate_identity",
  "isolate_resource",
  "create_ticket",
  "mark_contained",
  "mark_resolved",
];

const filterSelectClassName =
  "h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-cyan-400/30";

export function EventsView() {
  const { environment, runPlaybook, selectedEvent, setSelectedEvent, lastSimulationResult } = useDemo();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | EventSeverity>("all");
  const [status, setStatus] = useState<"all" | EventStatus>("all");
  const [category, setCategory] = useState<"all" | EventCategory>("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const events = useMemo(
    () =>
      filterEvents(environment.events, { severity, status, category }).filter((event) =>
        `${event.title} ${event.source} ${event.target} ${event.category} ${event.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [category, environment.events, query, severity, status],
  );

  const selected = selectedEvent;
  const allVisibleSelected = events.length > 0 && events.every((event) => selectedRows.includes(event.id));

  const runOpenPlaybooks = () => {
    events
      .filter((event) => event.status === "open")
      .slice(0, 5)
      .forEach((event) => runPlaybook(event.id));
  };

  const latestTimelineEntries = useMemo(
    () =>
      events
        .slice(0, 5)
        .flatMap((event) =>
          event.timeline.slice(0, 2).map((entry) => ({
            ...entry,
            eventTitle: event.title,
            severity: event.severity,
          })),
        )
        .slice(0, 8),
    [events],
  );

  return (
    <div className="space-y-4">
      <DatabaseShell
        title="Event Center"
        subtitle="Bu sayfa, olayları SIEM / SOAR akışında listeler; severity, category ve status filtreleriyle analiz edilmesini ve playbook aksiyonlarının uygulanmasını sağlar."
        count={events.length}
        toolbarTitle="All Events"
        primaryActionLabel="Açık Olayları İşle"
        onPrimaryAction={runOpenPlaybooks}
      >
        <div className="border-b border-[var(--border)] px-4 py-3 lg:px-5">
          <div className="grid gap-3 xl:grid-cols-[1.5fr,repeat(3,minmax(0,1fr))]">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Event, source, target veya kategori ara"
            />

            <select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} className={filterSelectClassName}>
              <option value="all">Tüm severity</option>
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>

            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className={filterSelectClassName}>
              <option value="all">Tüm category</option>
              {[
                "unauthorized_access_attempt",
                "suspicious_export",
                "public_bucket_detected",
                "missing_encryption",
                "impossible_travel",
                "api_abuse",
                "deception_triggered",
                "ransomware_indicator",
                "privilege_escalation",
                "policy_violation",
                "third_party_anomaly",
                "visibility_gap",
              ].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={filterSelectClassName}>
              <option value="all">Tüm status</option>
              <option value="open">open</option>
              <option value="investigating">investigating</option>
              <option value="contained">contained</option>
              <option value="resolved">resolved</option>
            </select>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-4 lg:p-5">
            <EmptyState
              title="Filtrelere uygun olay bulunamadı"
              description="Farklı severity, category veya status filtreleri seçerek olay setini yeniden genişletebilirsin."
            />
          </div>
        ) : (
          <DataTable className="min-w-[1220px]">
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeader className="w-12">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() =>
                      setSelectedRows(allVisibleSelected ? [] : events.map((event) => event.id))
                    }
                    aria-label="Tüm olayları seç"
                    className="h-4 w-4 rounded border-white/15 bg-transparent"
                  />
                </DataTableHeader>
                <DataTableHeader className="w-[24%]">Event</DataTableHeader>
                <DataTableHeader className="w-[10%]">Severity</DataTableHeader>
                <DataTableHeader className="w-[14%]">Category</DataTableHeader>
                <DataTableHeader className="w-[12%]">Source</DataTableHeader>
                <DataTableHeader className="w-[12%]">Target</DataTableHeader>
                <DataTableHeader className="w-[10%]">Status</DataTableHeader>
                <DataTableHeader className="w-[12%]">SOAR Action</DataTableHeader>
                <DataTableHeader className="w-[14%]">Time</DataTableHeader>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {events.map((event) => (
                <DataTableRow key={event.id} onClick={() => setSelectedEvent(event.id)}>
                  <DataTableCell>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(event.id)}
                      onChange={(entry) => {
                        entry.stopPropagation();
                        setSelectedRows((current) =>
                          current.includes(event.id)
                            ? current.filter((id) => id !== event.id)
                            : [...current, event.id],
                        );
                      }}
                      aria-label={`${event.title} olayını seç`}
                      className="h-4 w-4 rounded border-white/15 bg-transparent"
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-[var(--text-primary)]">{event.title}</span>
                        {event.category === "deception_triggered" ? (
                          <RelationPill label="deception" tone="deception" />
                        ) : null}
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
                  <DataTableCell>
                    <StatusBadge
                      label={event.status}
                      tone={
                        event.status === "resolved"
                          ? "low"
                          : event.status === "contained"
                            ? "policy"
                            : event.status === "investigating"
                              ? "medium"
                              : "critical"
                      }
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-xs text-[var(--text-muted)]">
                        {playbookActionLabel(event.playbookActions[0] ?? "create_ticket")}
                      </span>
                      <ActionButton
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={(entry) => {
                          entry.stopPropagation();
                          runPlaybook(event.id);
                        }}
                      >
                        Run
                      </ActionButton>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="font-mono text-xs text-[var(--text-muted)]">
                    {formatDateTime(event.timestamp)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </DatabaseShell>

      <PanelLikeTimeline
        entries={latestTimelineEntries}
        lastSimulationResult={lastSimulationResult}
        simulationTitle={
          lastSimulationResult
            ? environment.simulations.find((simulation) => simulation.id === lastSimulationResult.scenarioId)?.title ?? null
            : null
        }
      />

      <Drawer open={Boolean(selected)} onClose={() => setSelectedEvent(null)} title={selected?.title ?? "Event Detail"}>
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={selected.severity} />
                <StatusBadge
                  label={selected.status}
                  tone={
                    selected.status === "resolved"
                      ? "low"
                      : selected.status === "contained"
                        ? "policy"
                        : selected.status === "investigating"
                          ? "medium"
                          : "critical"
                  }
                />
                <RelationPill
                  label={selected.category}
                  tone={selected.category === "deception_triggered" ? "deception" : "info"}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{selected.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Source", selected.source],
                ["Target", selected.target],
                ["Control", selected.relatedControl],
                ["Recommendation", selected.recommendation],
                ["Status", selected.status],
                ["Time", formatDateTime(selected.timestamp)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Evidence</p>
              <div className="mt-3 space-y-2">
                {selected.evidence.map((item) => (
                  <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-secondary)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Timeline</p>
              <div className="mt-3 space-y-2">
                {selected.timeline.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{entry.message}</p>
                      <p className="font-mono text-[11px] text-[var(--text-muted)]">{formatDateTime(entry.timestamp)}</p>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{entry.actor}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Playbook Actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {playbookButtons.map((action) => (
                  <ActionButton
                    key={action}
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() => runPlaybook(selected.id, action)}
                  >
                    {playbookActionLabel(action)}
                  </ActionButton>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function PanelLikeTimeline({
  entries,
  lastSimulationResult,
  simulationTitle,
}: {
  entries: Array<{
    id: string;
    timestamp: string;
    message: string;
    actor: string;
    eventTitle: string;
    severity: EventSeverity;
  }>;
  lastSimulationResult: { summary: string; createdAt: string; affectedModules?: string[] } | null;
  simulationTitle: string | null;
}) {
  if (!entries.length && !lastSimulationResult) {
    return null;
  }

  return (
    <div className="hcsc-panel overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3 lg:px-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Event Timeline</h2>
        <p className="text-sm text-[var(--text-muted)]">Olayların zaman çizelgesindeki son operasyon kayıtları</p>
      </div>
      {lastSimulationResult ? (
        <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 lg:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Son çalışma: {simulationTitle ?? "Çalıştırılan senaryo"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{lastSimulationResult.summary}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-xs text-[var(--text-muted)]">{formatDateTime(lastSimulationResult.createdAt)}</p>
              {lastSimulationResult.affectedModules?.length ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Etkilenen modüller: {lastSimulationResult.affectedModules.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="grid gap-px bg-[var(--border)] lg:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-[var(--surface-elevated)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{entry.eventTitle}</p>
              <SeverityBadge severity={entry.severity} />
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{entry.message}</p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
              <span className="truncate">{entry.actor}</span>
              <span className="font-mono">{formatDateTime(entry.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
