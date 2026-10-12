"use client";

import { useGuidedRun } from "./use-guided-run";
import { useSecurityConsoleStore } from "@/store/security-console-store";
import { ActionButton } from "@/components/ui/action-button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

export function GuidedRunPanel() {
  const guide = useGuidedRun();
  const steps = useSecurityConsoleStore((state) => state.environment.demoScenario.steps);
  if (!guide.visible || !steps.length) return null;
  const index = Math.min(guide.step, steps.length - 1);
  const step = steps[index];
  return (
    <Panel className="overflow-hidden rounded-[14px] p-0">
      <section id="guided-run" aria-labelledby="guided-run-title">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 id="guided-run-title" className="text-base font-semibold">Operasyon Senaryo Akışı</h2>
            <p className="text-sm text-[var(--text-muted)]">Öğretici görünüm; veri değiştirmez, tarama veya müdahale başlatmaz.</p>
          </div>
          <ActionButton variant="secondary" onClick={() => guide.dispatch("close")} aria-label="Öğreticiyi gizle">Gizle</ActionButton>
        </div>
        <div className="grid lg:grid-cols-2">
          <div className="space-y-3 px-4 py-4">
            <StatusBadge label={`Adım ${index + 1} / ${steps.length}`} tone="policy" />
            <div aria-live="polite" aria-atomic="true">
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="secondary" disabled={index === 0} onClick={() => guide.dispatch("previous")}>Geri</ActionButton>
              <ActionButton onClick={() => guide.dispatch("next")}>{index === steps.length - 1 ? "Öğreticiyi tamamla" : "İleri"}</ActionButton>
              <ActionButton variant="secondary" onClick={() => guide.dispatch("open")}>Baştan başlat</ActionButton>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Tamamlandığında gizlenir. Guided Run düğmesiyle tekrar açabilirsin.</p>
          </div>
          <ol className="divide-y divide-[var(--border)] border-t border-[var(--border)] lg:border-t-0 lg:border-l">
            {steps.map((item, itemIndex) => (
              <li key={item.id} aria-current={itemIndex === index ? "step" : undefined} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="text-sm">{itemIndex + 1}. {item.title}</span>
                <StatusBadge label={itemIndex < index ? "tamamlandı" : itemIndex === index ? "aktif" : "sırada"} tone={itemIndex < index ? "low" : itemIndex === index ? "policy" : "neutral"} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Panel>
  );
}
