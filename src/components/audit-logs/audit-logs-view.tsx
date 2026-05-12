"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/utils";

const severityOptions = ["all", "info", "warning", "high", "critical"] as const;

export function AuditLogsView() {
  const { auditLogs, can } = useDemo();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<(typeof severityOptions)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return auditLogs.filter((entry) => {
      const matchesQuery =
        !query.trim() ||
        `${entry.actorName} ${entry.action} ${entry.module} ${entry.target} ${entry.details}`
          .toLowerCase()
          .includes(query.trim().toLowerCase());
      const matchesSeverity = severity === "all" || entry.severity === severity;
      return matchesQuery && matchesSeverity;
    });
  }, [auditLogs, query, severity]);

  const selected = filtered.find((item) => item.id === selectedId) ?? auditLogs.find((item) => item.id === selectedId) ?? null;

  if (!can("view_audit_logs")) {
    return (
      <Panel>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-200">
          Bu görünüm için <span className="font-semibold">Audit Logs</span> yetkisi gerekir.
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Traceability</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Audit Logs</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Kimlik doğrulama, Zero Trust kararları, deception alarmları, rapor üretimi ve operasyon çalıştırmaları için denetlenebilir kayıtlar.
            </p>
          </div>
          <div className="w-full max-w-[780px]">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Aktör, modül veya aksiyon ara"
              className="lg:w-[360px]"
            />
            <div className="flex flex-wrap gap-2">
              {severityOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSeverity(option)}
                  className={`min-w-[78px] rounded-xl border px-3 py-2 text-sm transition ${
                    severity === option
                      ? "border-cyan-500/30 bg-cyan-500/12 text-cyan-200"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        {filtered.length ? (
          <DataTable className="min-w-[980px]">
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeader className="w-[18%]">Actor</DataTableHeader>
                <DataTableHeader className="w-[16%]">Action</DataTableHeader>
                <DataTableHeader className="w-[14%]">Module</DataTableHeader>
                <DataTableHeader className="w-[16%]">Target</DataTableHeader>
                <DataTableHeader className="w-[12%]">Severity</DataTableHeader>
                <DataTableHeader className="w-[10%]">Result</DataTableHeader>
                <DataTableHeader className="w-[14%]">Time</DataTableHeader>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {filtered.map((entry) => (
                <DataTableRow key={entry.id} onClick={() => setSelectedId(entry.id)}>
                  <DataTableCell>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{entry.actorName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{entry.actorRole}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="font-mono text-xs text-[var(--text-primary)]">{entry.action}</DataTableCell>
                  <DataTableCell className="text-sm text-[var(--text-secondary)]">{entry.module}</DataTableCell>
                  <DataTableCell className="text-sm text-[var(--text-secondary)]">{entry.target}</DataTableCell>
                  <DataTableCell>
                    <Badge
                      label={entry.severity}
                      tone={
                        entry.severity === "critical"
                          ? "critical"
                          : entry.severity === "high"
                            ? "high"
                            : entry.severity === "warning"
                              ? "medium"
                              : "info"
                      }
                    />
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      label={entry.result}
                      tone={entry.result === "success" ? "low" : entry.result === "failure" ? "critical" : "medium"}
                    />
                  </DataTableCell>
                  <DataTableCell className="font-mono text-xs text-[var(--text-muted)]">{formatDateTime(entry.timestamp)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : (
          <div className="p-6">
            <div className="mx-auto max-w-[780px]">
              <EmptyState
                title="Henüz audit kaydı bulunmuyor"
                description="Kimlik, olay, rapor veya operasyon aksiyonları oluştukça bu alanda denetim kayıtları görünür."
              />
            </div>
          </div>
        )}
      </Panel>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.action ?? "Audit detayı"}
        subtitle={selected ? formatDateTime(selected.timestamp) : undefined}
        badge={
          selected ? (
            <Badge
              label={selected.severity}
              tone={
                selected.severity === "critical"
                  ? "critical"
                  : selected.severity === "high"
                    ? "high"
                    : selected.severity === "warning"
                      ? "medium"
                      : "info"
              }
            />
          ) : undefined
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Actor" value={selected.actorName} />
              <Metric label="Role" value={selected.actorRole} />
              <Metric label="Module" value={selected.module} />
              <Metric label="Target" value={selected.target} />
              <Metric label="Result" value={selected.result} />
              <Metric label="Source IP" value={selected.ipAddress} />
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Details</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{selected.details}</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
