"use client";

import { Database, MonitorSmartphone, Radar, ServerCog, Shield, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { RelationPill } from "@/components/ui/relation-pill";
import { StatusBadge } from "@/components/ui/status-badge";

const positions: Record<string, { x: number; y: number; w: number; h: number }> = {
  "node-users": { x: 48, y: 52, w: 238, h: 198 },
  "node-iam": { x: 360, y: 52, w: 246, h: 198 },
  "node-zta": { x: 690, y: 40, w: 272, h: 206 },
  "node-api": { x: 1048, y: 52, w: 246, h: 198 },
  "node-saas": { x: 1358, y: 52, w: 226, h: 198 },
  "node-devices": { x: 68, y: 332, w: 242, h: 198 },
  "node-siem": { x: 408, y: 368, w: 266, h: 206 },
  "node-private": { x: 758, y: 324, w: 286, h: 214 },
  "node-public": { x: 1148, y: 336, w: 266, h: 206 },
  "node-deception": { x: 236, y: 668, w: 266, h: 198 },
  "node-backup": { x: 742, y: 668, w: 258, h: 198 },
  "node-compliance": { x: 1240, y: 668, w: 286, h: 198 },
};

const kindIcons = {
  user: Users,
  device: MonitorSmartphone,
  security: Shield,
  cloud: ServerCog,
  data: Database,
  compliance: ShieldCheck,
  deception: Radar,
} as const;

const linkStroke = {
  safe: "rgba(34, 211, 238, 0.72)",
  warning: "rgba(245, 158, 11, 0.64)",
  critical: "rgba(244, 63, 94, 0.68)",
  deception: "rgba(139, 92, 246, 0.7)",
} as const;

export function CloudMapView() {
  const { environment } = useDemo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = environment.cloudNodes.find((node) => node.id === selectedId) ?? null;

  const eventCountByNode = useMemo(
    () =>
      Object.fromEntries(
        environment.cloudNodes.map((node) => [node.id, node.relatedEventIds.length]),
      ),
    [environment.cloudNodes],
  );

  return (
    <div className="space-y-4">
      <Panel>
        <PageIntro
          eyebrow="Architecture Diagram"
          title="Cloud Map"
          description="Bu görünüm, hibrit bulut güvenlik mimarisini hizalı bir topoloji üstünde gösterir. Node’lar kullanıcı, Zero Trust, bulut, deception ve uyumluluk katmanlarını aynı sistem diliyle sunar."
        />
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Aligned Topology</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Node’lara tıklayarak ilişkili varlık, olay ve kontrol detaylarını açabilirsin.
          </p>
        </div>

        <div className="hcsc-scrollbar overflow-x-auto overflow-y-hidden">
          <div
            className="relative h-[940px] min-w-[1640px]"
            style={{
              background: "var(--map-canvas)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--map-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--map-grid)_1px,transparent_1px)] bg-[size:72px_72px]"
            />
            <svg className="absolute inset-0 h-full w-full">
              {environment.cloudLinks.map((link) => {
                const from = positions[link.from];
                const to = positions[link.to];

                if (!from || !to) {
                  return null;
                }

                const x1 = from.x + from.w / 2;
                const y1 = from.y + from.h / 2;
                const x2 = to.x + to.w / 2;
                const y2 = to.y + to.h / 2;

                return (
                  <line
                    key={link.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={linkStroke[link.tone]}
                    strokeWidth={link.tone === "deception" ? 3 : 2.5}
                    strokeDasharray={link.tone === "deception" ? "6 6" : undefined}
                  />
                );
              })}
            </svg>

            {environment.cloudNodes.map((node) => {
              const Icon = kindIcons[node.kind];
              const position = positions[node.id];

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                  className="absolute rounded-[28px] border border-[var(--border)] bg-[color:var(--surface-elevated)]/96 p-6 text-left shadow-[var(--elevated-shadow)] transition hover:border-[color-mix(in_srgb,var(--info)_26%,var(--border))] hover:bg-[color:var(--surface-elevated)]"
                  style={{
                    left: position.x,
                    top: position.y,
                    width: position.w,
                    minHeight: position.h,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0 text-[var(--info)]" />
                        <p className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{node.label}</p>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{node.kind}</p>
                    </div>
                    <Badge
                      label={node.riskLevel}
                      tone={
                        node.kind === "deception"
                          ? "deception"
                          : node.riskLevel === "critical"
                            ? "critical"
                            : node.riskLevel === "high"
                              ? "high"
                              : node.riskLevel === "medium"
                                ? "medium"
                                : "low"
                      }
                    />
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-8 text-[var(--text-secondary)]">{node.description}</p>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]">
                    <span>{eventCountByNode[node.id]} olay</span>
                    <span>{node.relatedAssetIds.length} varlık</span>
                  </div>
                </button>
              );
            })}
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
            <StatusBadge
              label={selected.riskLevel}
              tone={
                selected.kind === "deception"
                  ? "deception"
                  : selected.riskLevel === "critical"
                    ? "critical"
                    : selected.riskLevel === "high"
                      ? "high"
                      : selected.riskLevel === "medium"
                        ? "medium"
                        : "low"
              }
            />
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
                  <RelationPill key={control} label={control} tone="policy" />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
