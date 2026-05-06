"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { mockOrganization } from "@/lib/auth-mock-data";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segmented-control";

const frameworkOptions = ["KVKK", "GDPR", "ISO 27001", "NIST CSF 2.0"] as const;
const cloudModes = ["Private Cloud", "Public Cloud", "Hybrid Cloud"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useDemo();
  const [organizationName, setOrganizationName] = useState(mockOrganization.name);
  const [cloudMode, setCloudMode] = useState<(typeof cloudModes)[number]>(mockOrganization.cloudMode);
  const [frameworks, setFrameworks] = useState<string[]>(mockOrganization.complianceFrameworks);
  const [seedDemoData, setSeedDemoData] = useState(true);
  const [runInitialScan, setRunInitialScan] = useState(true);

  return (
    <main className="min-h-svh bg-background px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Onboarding</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Kurulumu tamamla</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Organizasyon, bulut modu ve uyumluluk çerçevelerini doğrulayarak v1 prototipini güvenli demo verisiyle hazırla.
            </p>
          </div>
          <Badge variant="outline">5 adımlı kurulum</Badge>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.75fr,1.25fr]">
          <Panel className="space-y-4">
            {[
              "1. Organizasyon bilgileri",
              "2. Bulut ortamı seçimi",
              "3. Uyumluluk çerçeveleri",
              "4. Demo veri yükleme",
              "5. İlk güvenlik taraması",
            ].map((step, index) => (
              <div key={step} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">{step}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {index < 3 ? "Yapılandırma" : "Hazırlık"} aşaması
                </p>
              </div>
            ))}
          </Panel>

          <Panel className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organizasyon adı</Label>
              <Input id="org-name" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
            </div>

            <div className="space-y-3">
              <Label>Bulut modu</Label>
              <SegmentedControl
                value={cloudMode}
                onChange={(value) => setCloudMode(value as (typeof cloudModes)[number])}
                options={cloudModes.map((mode) => ({ value: mode, label: mode }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Uyumluluk çerçeveleri</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {frameworkOptions.map((framework) => (
                  <label
                    key={framework}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  >
                    <Checkbox
                      checked={frameworks.includes(framework)}
                      onCheckedChange={(checked) =>
                        setFrameworks((current) =>
                          checked
                            ? Array.from(new Set([...current, framework]))
                            : current.filter((item) => item !== framework),
                        )
                      }
                    />
                    <span className="text-sm text-[var(--text-primary)]">{framework}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <Checkbox checked={seedDemoData} onCheckedChange={(checked) => setSeedDemoData(Boolean(checked))} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Demo data yükle</p>
                  <p className="text-xs text-[var(--text-muted)]">Tez senaryoları için hazır ortam kurulur.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <Checkbox checked={runInitialScan} onCheckedChange={(checked) => setRunInitialScan(Boolean(checked))} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">İlk güvenlik taramasını başlat</p>
                  <p className="text-xs text-[var(--text-muted)]">Risk skorları onboarding sonunda yeniden hesaplanır.</p>
                </div>
              </label>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
              Bu kurulum gerçek altyapıya bağlanmaz. Demo ortamını, uyumluluk kapsamlarını ve hibrit bulut profilini güvenli mock state üzerinde hazırlar.
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  completeOnboarding({
                    organizationName,
                    cloudMode,
                    complianceFrameworks: frameworks,
                    seedDemoData,
                    runInitialScan,
                  });
                  router.replace("/dashboard");
                }}
              >
                Onboarding’i tamamla
              </Button>
              <Button variant="outline" onClick={() => router.replace("/dashboard")}>
                Şimdilik geç
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
