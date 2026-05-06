"use client";

import {
  ArrowRight,
  Database,
  MonitorSmartphone,
  Radar,
  ServerCog,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { RelationPill } from "@/components/ui/relation-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const kindIcons = {
  user: Users,
  device: MonitorSmartphone,
  security: Shield,
  cloud: ServerCog,
  data: Database,
  compliance: ShieldCheck,
  deception: Radar,
} as const;

const layoutClasses: Record<string, string> = {
  "node-users": "xl:col-span-3",
  "node-iam": "xl:col-span-3",
  "node-zta": "xl:col-span-3",
  "node-api": "xl:col-span-3",
  "node-devices": "xl:col-span-3",
  "node-private": "xl:col-span-3",
  "node-public": "xl:col-span-3",
  "node-saas": "xl:col-span-3",
  "node-deception": "xl:col-span-4",
  "node-siem": "xl:col-span-4",
  "node-backup": "xl:col-span-4",
  "node-compliance": "xl:col-span-12",
};

const preferredOrder = [
  "node-users",
  "node-iam",
  "node-zta",
  "node-api",
  "node-devices",
  "node-private",
  "node-public",
  "node-saas",
  "node-deception",
  "node-siem",
  "node-backup",
  "node-compliance",
] as const;

const toneLabelMap = {
  safe: "Trusted Flow",
  warning: "Elevated Path",
  critical: "Critical Feed",
  deception: "Deception Channel",
} as const;

function getRiskTone(level: "low" | "medium" | "high" | "critical", kind: string) {
  if (kind === "deception") return "deception";
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  return "low";
}

function getCardClasses(level: "low" | "medium" | "high" | "critical", kind: string) {
  if (kind === "deception") {
    return "border-violet-500/28 bg-[linear-gradient(180deg,rgba(32,25,56,0.96)_0%,rgba(24,21,39,0.96)_100%)] shadow-[0_24px_60px_rgba(91,33,182,0.18)]";
  }
  if (level === "critical") {
    return "border-rose-500/24 bg-[linear-gradient(180deg,rgba(37,23,28,0.92)_0%,rgba(27,25,28,0.96)_100%)]";
  }
  if (level === "high") {
    return "border-amber-500/22 bg-[linear-gradient(180deg,rgba(38,31,18,0.78)_0%,rgba(29,27,31,0.96)_100%)]";
  }
  if (level === "low") {
    return "border-emerald-500/22 bg-[linear-gradient(180deg,rgba(15,38,31,0.78)_0%,rgba(23,24,31,0.96)_100%)]";
  }
  return "border-[var(--border)] bg-[linear-gradient(180deg,rgba(22,27,37,0.9)_0%,rgba(30,29,33,0.96)_100%)]";
}

export function CloudMapView() {
  const { environment } = useDemo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = environment.cloudNodes.find((node) => node.id === selectedId) ?? null;

  const orderedNodes = useMemo(() => {
    return preferredOrder
      .map((id) => environment.cloudNodes.find((node) => node.id === id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
  }, [environment.cloudNodes]);

  const eventCountByNode = useMemo(
    () => Object.fromEntries(environment.cloudNodes.map((node) => [node.id, node.relatedEventIds.length])),
    [environment.cloudNodes],
  );

  const deceptionPaths = environment.cloudLinks.filter((link) => link.tone === "deception").length;

  return (
    <div className="space-y-4">
      <Panel>
        <PageIntro
          eyebrow="Architecture Diagram"
          title="Cloud Map"
          description="Bu görünüm, hibrit bulut güvenlik mimarisini tek sayfa içinde daha okunur bir kontrol topolojisi olarak sunar. Kullanıcı, Zero Trust, bulut, deception ve compliance katmanları aynı sistem ritminde hizalanır."
        />
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Aligned Topology</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Node’lara tıklayarak ilişkili varlık, olay ve kontrol detaylarını açabilirsin.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <TopologyStat label="Mapped Nodes" value={String(environment.cloudNodes.length)} />
              <TopologyStat label="Signal Paths" value={String(environment.cloudLinks.length)} />
              <TopologyStat label="Deception Links" value={String(deceptionPaths)} />
            </div>
          </div>
        </div>

        <div
          className="relative overflow-hidden px-5 py-5"
          style={{ background: "var(--surface)" }}
        >
          <div className="relative z-10 grid gap-3 lg:grid-cols-2 xl:grid-cols-12">
            {orderedNodes.map((node) => {
              const Icon = kindIcons[node.kind];
              const tone = getRiskTone(node.riskLevel, node.kind);

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    "group relative min-h-[214px] overflow-hidden rounded-[28px] border p-5 text-left shadow-[var(--elevated-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--info)_26%,var(--border))]",
                    getCardClasses(node.riskLevel, node.kind),
                    layoutClasses[node.id],
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.24),transparent)]" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--info)]">
                          <Icon className="size-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{node.label}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{node.kind}</p>
                        </div>
                      </div>
                    </div>
                    <Badge label={node.riskLevel} tone={tone} />
                  </div>

                  <p className="mt-5 line-clamp-3 text-[13px] leading-7 text-[var(--text-secondary)]">{node.description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {node.recommendedControls.slice(0, node.id === "node-compliance" ? 4 : 3).map((control) => (
                      <RelationPill key={control} label={control} tone={node.kind === "deception" ? "deception" : "policy"} />
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-3.5 text-[11px] text-[var(--text-muted)]">
                    <span>{eventCountByNode[node.id]} olay</span>
                    <span>{node.relatedAssetIds.length} varlık</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="relative z-10 mt-5 rounded-[24px] border border-[var(--border)] bg-[color:var(--surface)]/92 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Signal Paths</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Mimari içindeki güvenli akışlar, uyarı kanalları, kritik feed’ler ve deception yönlendirmeleri.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["safe", "warning", "critical", "deception"] as const).map((tone) => (
                  <Badge
                    key={tone}
                    label={toneLabelMap[tone]}
                    tone={
                      tone === "safe"
                        ? "low"
                        : tone === "warning"
                          ? "medium"
                          : tone === "critical"
                            ? "critical"
                            : "deception"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {environment.cloudLinks.map((link) => {
                const from = environment.cloudNodes.find((node) => node.id === link.from);
                const to = environment.cloudNodes.find((node) => node.id === link.to);

                return (
                  <div
                    key={link.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs text-[var(--text-secondary)]",
                      link.tone === "safe"
                        ? "border-cyan-500/20 bg-cyan-500/8"
                        : link.tone === "warning"
                          ? "border-amber-500/20 bg-amber-500/8"
                          : link.tone === "critical"
                            ? "border-rose-500/20 bg-rose-500/8"
                            : "border-violet-500/20 bg-violet-500/10",
                    )}
                  >
                    <span className="font-medium text-[var(--text-primary)]">{from?.label}</span>
                    <ArrowRight className="size-3.5 shrink-0 opacity-70" />
                    <span>{link.label}</span>
                    <ArrowRight className="size-3.5 shrink-0 opacity-70" />
                    <span className="font-medium text-[var(--text-primary)]">{to?.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.label ?? "Node detail"}
        subtitle="Seçili mimari düğümün olay, varlık ve kontrol özeti"
        badge={
          selected ? (
            <StatusBadge label={selected.riskLevel} tone={getRiskTone(selected.riskLevel, selected.kind)} />
          ) : undefined
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{selected.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Node Kind</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selected.kind}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Related Events</p>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{selected.relatedEventIds.length}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">İlişkili veri varlıkları</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.relatedAssetIds.map((assetId) => {
                  const asset = environment.assets.find((entry) => entry.id === assetId);
                  return asset ? <Badge key={asset.id} label={asset.name} tone="info" /> : null;
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">İlişkili olaylar</p>
              <div className="mt-3 space-y-2">
                {selected.relatedEventIds.slice(0, 6).map((eventId) => {
                  const event = environment.events.find((entry) => entry.id === eventId);
                  return event ? (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]"
                    >
                      {event.title}
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Önerilen kontroller</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.recommendedControls.map((control) => (
                  <RelationPill key={control} label={control} tone={selected.kind === "deception" ? "deception" : "policy"} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function TopologyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)]/92 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
