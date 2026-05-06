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
import { AvatarToken } from "@/components/ui/avatar-token";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { RelationPill } from "@/components/ui/relation-pill";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { classificationLabel, formatDateTime, requestStatusTone } from "@/lib/utils";
import { AccessRequest, RequestStatus, RiskLevel } from "@/types";

const filterSelectClassName =
  "h-9 rounded-xl border border-white/8 bg-white/5 px-3 text-sm text-slate-200 outline-none transition focus:border-cyan-400/30";

const statusFilters: Array<{ label: string; value: "all" | RequestStatus }> = [
  { label: "Tümü", value: "all" },
  { label: "Bekleyen", value: "pending" },
  { label: "Onaylanan", value: "approved" },
  { label: "Reddedilen", value: "rejected" },
  { label: "Step-up", value: "step_up" },
  { label: "İzole", value: "isolated" },
];

function decisionTone(decision: AccessRequest["evaluation"]["decision"]) {
  if (decision === "isolate") {
    return "critical" as const;
  }

  if (decision === "deny") {
    return "high" as const;
  }

  if (decision === "require_step_up_auth") {
    return "medium" as const;
  }

  if (decision === "limited_allow") {
    return "policy" as const;
  }

  return "low" as const;
}

function riskLevelFromRequest(score: number): RiskLevel {
  if (score >= 85) {
    return "critical";
  }

  if (score >= 70) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

export function AccessRequestsView() {
  const { environment, evaluateAccessRequest, selectedAccessRequest, setSelectedAccessRequest } = useDemo();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const requests = useMemo(
    () =>
      environment.accessRequests
        .filter((request) => (statusFilter === "all" ? true : request.status === statusFilter))
        .filter((request) =>
          `${request.identityName} ${request.targetAssetName} ${request.role} ${request.requestedAction}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
    [environment.accessRequests, query, statusFilter],
  );

  const selected = selectedAccessRequest;
  const allVisibleSelected =
    requests.length > 0 && requests.every((request) => selectedRows.includes(request.id));

  const evaluatePendingRequests = () => {
    requests
      .filter((request) => request.status === "pending")
      .slice(0, 5)
      .forEach((request) => evaluateAccessRequest(request.id));
  };

  const toolbarExtra = (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {statusFilters.map((item) => (
        <ActionButton
          key={item.value}
          variant={statusFilter === item.value ? "secondary" : "ghost"}
          className="h-8 whitespace-nowrap px-2.5 text-xs"
          onClick={() => setStatusFilter(item.value)}
        >
          {item.label}
        </ActionButton>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <DatabaseShell
        title="Erişim Talepleri"
        subtitle="Bu sayfa, kimlik, MFA, cihaz güveni, zaman ve lokasyon riski sinyallerini birleştirerek erişim taleplerini Zero Trust mantığıyla değerlendirir."
        count={requests.length}
        toolbarTitle="Access Requests"
        primaryActionLabel="Bekleyenleri Değerlendir"
        onPrimaryAction={evaluatePendingRequests}
        toolbarExtra={toolbarExtra}
      >
        <div className="border-b border-white/8 px-4 py-3 lg:px-5">
          <div className="grid gap-3 xl:grid-cols-[1.4fr,repeat(3,minmax(0,1fr))]">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Identity, asset, role veya action ara"
            />

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={filterSelectClassName}>
              {statusFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <div className="flex h-9 items-center rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm text-slate-400">
              Kritik kararlar: {requests.filter((request) => ["rejected", "isolated"].includes(request.status)).length}
            </div>

            <div className="flex h-9 items-center rounded-xl border border-white/8 bg-white/[0.03] px-3 text-sm text-slate-400">
              Step-up gerekenler: {requests.filter((request) => request.status === "step_up").length}
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="p-4 lg:p-5">
            <EmptyState
              title="Filtrelere uygun erişim talebi bulunamadı"
              description="Durum filtresini veya arama kelimesini değiştirerek farklı talepleri inceleyebilirsin."
            />
          </div>
        ) : (
          <DataTable className="min-w-[1180px]">
            <DataTableHead>
              <DataTableHeaderRow>
                <DataTableHeader className="w-12">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() =>
                      setSelectedRows(allVisibleSelected ? [] : requests.map((request) => request.id))
                    }
                    aria-label="Tüm talepleri seç"
                    className="h-4 w-4 rounded border-white/15 bg-transparent"
                  />
                </DataTableHeader>
                <DataTableHeader className="w-[16%]">Request</DataTableHeader>
                <DataTableHeader className="w-[18%]">Identity</DataTableHeader>
                <DataTableHeader className="w-[16%]">Target Asset</DataTableHeader>
                <DataTableHeader className="w-[10%]">Action</DataTableHeader>
                <DataTableHeader className="w-[8%]">MFA</DataTableHeader>
                <DataTableHeader className="w-[10%]">Device Trust</DataTableHeader>
                <DataTableHeader className="w-[10%]">Risk</DataTableHeader>
                <DataTableHeader className="w-[12%]">Decision</DataTableHeader>
                <DataTableHeader className="w-[12%]">Time</DataTableHeader>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {requests.map((request) => {
                const riskLevel = riskLevelFromRequest(request.evaluation.riskScore);

                return (
                    <DataTableRow key={request.id} onClick={() => setSelectedAccessRequest(request.id)}>
                    <DataTableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(request.id)}
                        onChange={(event) => {
                          event.stopPropagation();
                          setSelectedRows((current) =>
                            current.includes(request.id)
                              ? current.filter((id) => id !== request.id)
                              : [...current, request.id],
                          );
                        }}
                        aria-label={`${request.identityName} talebini seç`}
                        className="h-4 w-4 rounded border-white/15 bg-transparent"
                      />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)]">{request.requestedAction}</span>
                          <StatusBadge label={request.status} tone={requestStatusTone(request.status)} />
                        </div>
                        <p className="line-clamp-1 text-xs text-[var(--text-muted)]">
                          {classificationLabel(request.dataSensitivity)} veri için erişim talebi
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <AvatarToken label={request.identityName} subtitle={`${request.identityType} • ${request.role}`} />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="space-y-1">
                        <span className="text-sm text-[var(--text-primary)]">{request.targetAssetName}</span>
                        <p className="text-xs text-[var(--text-muted)]">{request.sourceRegion}</p>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <RelationPill label={request.requestedAction} tone="policy" />
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge label={request.mfa ? "Enabled" : "Missing"} tone={request.mfa ? "low" : "critical"} />
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge
                        label={request.deviceTrust}
                        tone={
                          request.deviceTrust === "trusted" || request.deviceTrust === "managed"
                            ? "low"
                            : request.deviceTrust === "unknown"
                              ? "medium"
                              : "critical"
                        }
                      />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={riskLevel} tone={decisionTone(request.evaluation.decision)} />
                        <span className="font-mono text-xs text-[var(--text-muted)]">{request.evaluation.riskScore}/100</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge label={request.evaluation.decision} tone={decisionTone(request.evaluation.decision)} />
                        <ActionButton
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            evaluateAccessRequest(request.id);
                          }}
                        >
                          Evaluate
                        </ActionButton>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="font-mono text-xs text-[var(--text-muted)]">
                      {formatDateTime(request.requestTime)}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </DatabaseShell>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedAccessRequest(null)}
        title={selected?.identityName ?? "Access Request Detail"}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={selected.status} tone={requestStatusTone(selected.status)} />
                <StatusBadge label={selected.evaluation.decision} tone={decisionTone(selected.evaluation.decision)} />
                <RelationPill label={selected.requestedAction} tone="policy" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {selected.identityName}, {selected.targetAssetName} üzerinde {selected.requestedAction} işlemi
                talep etti. Karar motoru MFA, cihaz güveni, zaman, lokasyon ve anomali skorunu birlikte
                değerlendirdi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Identity Type", selected.identityType],
                ["Role", selected.role],
                ["MFA", selected.mfa ? "Enabled" : "Missing"],
                ["Device Trust", selected.deviceTrust],
                ["Source Region", selected.sourceRegion],
                ["Location Risk", selected.locationRisk],
                ["Time Risk", selected.timeRisk],
                ["Anomaly Score", String(selected.anomalyScore)],
                ["Data Sensitivity", classificationLabel(selected.dataSensitivity)],
                ["Requested At", formatDateTime(selected.requestTime)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Reason Listesi</p>
              <div className="mt-3 space-y-2">
                {selected.evaluation.reasons.map((reason) => (
                  <div key={reason} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-secondary)]">
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Required Actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.evaluation.requiredActions.map((action) => (
                  <RelationPill key={action} label={action} tone="info" />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => evaluateAccessRequest(selected.id)}>
                Talebi Zero Trust ile değerlendir
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => setSelectedAccessRequest(null)}>
                Drawer kapat
              </ActionButton>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
