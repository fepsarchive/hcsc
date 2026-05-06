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
import { RiskBadge } from "@/components/ui/risk-badge";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  classificationLabel,
  formatDateTime,
  locationLabel,
  riskTone,
  severityTone,
} from "@/lib/utils";
import {
  CloudLocation,
  DataClassification,
  DataTemperature,
  DataAsset,
  RiskLevel,
} from "@/types";

const filterSelectClassName =
  "h-9 rounded-xl border border-white/8 bg-white/5 px-3 text-sm text-slate-200 outline-none transition focus:border-cyan-400/30";

function classificationTone(value: DataClassification) {
  if (value === "critical") {
    return "critical";
  }

  if (value === "sensitive") {
    return "high";
  }

  if (value === "confidential") {
    return "medium";
  }

  return "policy";
}

function encryptionState(asset: DataAsset) {
  if (asset.encryptionEnabled && asset.kmsEnabled) {
    return { label: "Encrypted", tone: "low" as const };
  }

  if (asset.encryptionEnabled) {
    return { label: "KMS Partial", tone: "medium" as const };
  }

  return { label: "Missing", tone: "critical" as const };
}

export function DataAssetsView() {
  const { environment, runRiskAnalysis, selectedAsset, setSelectedAsset } = useDemo();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<"all" | DataClassification>("all");
  const [locationFilter, setLocationFilter] = useState<"all" | CloudLocation>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [temperatureFilter, setTemperatureFilter] = useState<"all" | DataTemperature>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const assets = useMemo(
    () =>
      environment.assets
        .filter((asset) => !asset.isDeception)
        .filter((asset) => (classFilter === "all" ? true : asset.classification === classFilter))
        .filter((asset) => (locationFilter === "all" ? true : asset.location === locationFilter))
        .filter((asset) => (riskFilter === "all" ? true : asset.risk.level === riskFilter))
        .filter((asset) => (temperatureFilter === "all" ? true : asset.temperature === temperatureFilter))
        .filter((asset) =>
          `${asset.name} ${asset.dataType} ${asset.owner} ${asset.path} ${asset.storageType}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((left, right) => right.risk.score - left.risk.score),
    [classFilter, environment.assets, locationFilter, query, riskFilter, temperatureFilter],
  );

  const selected = selectedAsset;
  const allVisibleSelected = assets.length > 0 && assets.every((asset) => selectedRows.includes(asset.id));

  const relatedEvents = useMemo(() => {
    if (!selected) {
      return [];
    }

    return environment.events
      .filter((event) => event.target.toLowerCase().includes(selected.name.toLowerCase()))
      .slice(0, 5);
  }, [environment.events, selected]);

  const toolbarExtra = (
    <div className="flex items-center gap-2">
      <ActionButton
        variant={viewMode === "table" ? "secondary" : "ghost"}
        className="h-8 px-2.5 text-xs"
        onClick={() => setViewMode("table")}
      >
        Table
      </ActionButton>
      <ActionButton
        variant={viewMode === "cards" ? "secondary" : "ghost"}
        className="h-8 px-2.5 text-xs"
        onClick={() => setViewMode("cards")}
      >
        Cards
      </ActionButton>
    </div>
  );

  return (
    <div className="space-y-4">
      <DatabaseShell
        title="Veri Varlıkları"
        subtitle="Bu sayfa, hibrit bulut ortamındaki veri varlıklarını sınıflandırır, risk skorlarını hesaplar ve güvenlik kontrolleriyle eşleştirir."
        count={assets.length}
        toolbarTitle="All Assets"
        primaryActionLabel="Risk Analizi Çalıştır"
        onPrimaryAction={() => runRiskAnalysis()}
        toolbarExtra={toolbarExtra}
      >
        <div className="border-b border-white/8 px-4 py-3 lg:px-5">
          <div className="grid gap-3 xl:grid-cols-[1.4fr,repeat(4,minmax(0,1fr))]">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Asset, owner, path veya storage type ara"
            />

            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value as typeof classFilter)} className={filterSelectClassName}>
              <option value="all">Tüm sınıflar</option>
              <option value="critical">Critical</option>
              <option value="sensitive">Sensitive</option>
              <option value="confidential">Confidential</option>
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </select>

            <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value as typeof locationFilter)} className={filterSelectClassName}>
              <option value="all">Tüm lokasyonlar</option>
              <option value="private_cloud">Özel Bulut</option>
              <option value="public_cloud">Genel Bulut</option>
              <option value="saas">SaaS</option>
              <option value="backup">Yedek</option>
            </select>

            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as typeof riskFilter)} className={filterSelectClassName}>
              <option value="all">Tüm riskler</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select value={temperatureFilter} onChange={(event) => setTemperatureFilter(event.target.value as typeof temperatureFilter)} className={filterSelectClassName}>
              <option value="all">Tüm sıcaklıklar</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="p-4 lg:p-5">
            <EmptyState
              title="Filtrelere uygun veri varlığı bulunamadı"
              description="Arama veya filtreleri değiştirerek envanter görünümünü genişletebilirsin."
            />
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3 lg:p-5">
            {assets.map((asset) => {
              const encryption = encryptionState(asset);

              return (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.id)}
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:bg-[var(--surface-elevated)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{asset.name}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">{asset.path}</p>
                    </div>
                    <RiskBadge level={asset.risk.level} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <RelationPill label={classificationLabel(asset.classification)} tone="policy" />
                    <RelationPill label={locationLabel(asset.location)} tone="neutral" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                      <p className="text-[var(--text-muted)]">Risk</p>
                      <p className="mt-1 font-mono text-[var(--text-primary)]">{asset.risk.score}/100</p>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2">
                      <p className="text-[var(--text-muted)]">Encryption</p>
                      <p className="mt-1 text-[var(--text-primary)]">{encryption.label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
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
                      setSelectedRows(allVisibleSelected ? [] : assets.map((asset) => asset.id))
                    }
                    aria-label="Tüm varlıkları seç"
                    className="h-4 w-4 rounded border-white/15 bg-transparent"
                  />
                </DataTableHeader>
                <DataTableHeader className="w-[24%]">Asset</DataTableHeader>
                <DataTableHeader className="w-[12%]">Classification</DataTableHeader>
                <DataTableHeader className="w-[12%]">Location</DataTableHeader>
                <DataTableHeader className="w-[12%]">Storage Type</DataTableHeader>
                <DataTableHeader className="w-[12%]">Risk</DataTableHeader>
                <DataTableHeader className="w-[12%]">Encryption</DataTableHeader>
                <DataTableHeader className="w-[12%]">Owner</DataTableHeader>
                <DataTableHeader className="w-[12%]">Last Access</DataTableHeader>
                <DataTableHeader className="w-[16%]">Findings</DataTableHeader>
              </DataTableHeaderRow>
            </DataTableHead>
            <DataTableBody>
              {assets.map((asset) => {
                const encryption = encryptionState(asset);

                return (
                  <DataTableRow key={asset.id} onClick={() => setSelectedAsset(asset.id)}>
                    <DataTableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(asset.id)}
                        onChange={(event) => {
                          event.stopPropagation();
                          setSelectedRows((current) =>
                            current.includes(asset.id)
                              ? current.filter((id) => id !== asset.id)
                              : [...current, asset.id],
                          );
                        }}
                        aria-label={`${asset.name} satırını seç`}
                        className="h-4 w-4 rounded border-white/15 bg-transparent"
                      />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-[var(--text-primary)]">{asset.name}</span>
                          {asset.kvkkScope ? <RelationPill label="KVKK" tone="info" /> : null}
                          {asset.gdprScope ? <RelationPill label="GDPR" tone="info" /> : null}
                        </div>
                        <p className="line-clamp-1 text-xs text-[var(--text-muted)]">{asset.path}</p>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge
                        label={classificationLabel(asset.classification)}
                        tone={classificationTone(asset.classification)}
                      />
                    </DataTableCell>
                    <DataTableCell className="text-sm text-[var(--text-secondary)]">{locationLabel(asset.location)}</DataTableCell>
                    <DataTableCell>
                      <RelationPill label={asset.storageType} tone="neutral" />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={asset.risk.level} />
                        <span className="font-mono text-xs text-[var(--text-muted)]">{asset.risk.score}/100</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge label={encryption.label} tone={encryption.tone} />
                    </DataTableCell>
                    <DataTableCell>
                      <AvatarToken label={asset.owner} subtitle={asset.temperature} />
                    </DataTableCell>
                    <DataTableCell className="font-mono text-xs text-[var(--text-muted)]">
                      {formatDateTime(asset.lastAccessedAt)}
                    </DataTableCell>
                    <DataTableCell>
                      <p className="line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                        {asset.findings.slice(0, 2).join(" • ")}
                      </p>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </DatabaseShell>

      <Drawer open={Boolean(selected)} onClose={() => setSelectedAsset(null)} title={selected?.name ?? "Asset Detail"}>
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={selected.risk.level} />
                <StatusBadge label={`${selected.risk.score}/100`} tone={riskTone(selected.risk.level)} />
                <StatusBadge
                  label={classificationLabel(selected.classification)}
                  tone={classificationTone(selected.classification)}
                />
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted)]">{selected.path}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {selected.dataType} veri tipi {locationLabel(selected.location)} üzerinde tutuluyor ve son 24 saatte{" "}
                {selected.accessCount24h} erişim gördü.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Location", locationLabel(selected.location)],
                ["Storage Type", selected.storageType],
                ["Temperature", selected.temperature],
                ["Owner", selected.owner],
                ["Encryption", selected.encryptionEnabled ? "Enabled" : "Missing"],
                ["KMS", selected.kmsEnabled ? "Enabled" : "Partial"],
                ["Backup", selected.backupEnabled ? "Enabled" : "Missing"],
                ["Retention", selected.retentionPolicy],
                ["KVKK", selected.kvkkScope ? "In Scope" : "No"],
                ["GDPR", selected.gdprScope ? "In Scope" : "No"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Findings</p>
              <div className="mt-3 space-y-2">
                {[...selected.findings, ...selected.risk.reasons].map((finding) => (
                  <div key={finding} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-secondary)]">
                    {finding}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Recommended Controls</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.recommendedControls.map((control) => (
                  <RelationPill key={control} label={control} tone="policy" />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Related Events</p>
              <div className="mt-3 space-y-2">
                {relatedEvents.length ? (
                  relatedEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{event.title}</p>
                        <StatusBadge label={event.severity} tone={severityTone(event.severity)} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTime(event.timestamp)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="İlişkili olay yok"
                    description="Bu varlık için aktif olay akışında eşleşen kayıt görünmüyor."
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={() => runRiskAnalysis(selected.id)}>Bu varlık için risk analizi çalıştır</ActionButton>
              <ActionButton variant="secondary" onClick={() => setSelectedAsset(null)}>
                Drawer kapat
              </ActionButton>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
