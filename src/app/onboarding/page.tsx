"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CircleCheckBigIcon } from "lucide-react";

import { useDemo } from "@/components/layout/demo-provider";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";

const frameworkOptions = ["KVKK", "GDPR", "ISO 27001", "NIST CSF 2.0"] as const;
const cloudModes = ["Private Cloud", "Public Cloud", "Hybrid Cloud"] as const;
const usageOptions = [
  { value: "saas", label: "SaaS Platformu" },
  { value: "fintech", label: "Fintech / Regüle" },
  { value: "retail", label: "Perakende / Operasyon" },
  { value: "platform", label: "B2B Platform" },
  { value: "managed-security", label: "Managed Security" },
] as const;
const currencyOptions = ["TRY", "USD", "EUR", "GBP"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, currentOrganization } = useDemo();

  const [organizationName, setOrganizationName] = useState(currentOrganization.name);
  const [city, setCity] = useState("İstanbul");
  const [cloudMode, setCloudMode] = useState<(typeof cloudModes)[number]>(currentOrganization.cloudMode);
  const [usageType, setUsageType] = useState<(typeof usageOptions)[number]["value"]>("saas");
  const [defaultCurrency, setDefaultCurrency] = useState<(typeof currencyOptions)[number]>("TRY");
  const [frameworks, setFrameworks] = useState<string[]>(currentOrganization.complianceFrameworks);
  const [seedDemoData, setSeedDemoData] = useState(true);
  const [runInitialScan, setRunInitialScan] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUsage = useMemo(
    () => usageOptions.find((option) => option.value === usageType)?.label ?? "SaaS Platformu",
    [usageType],
  );

  return (
    <AuthShell
      eyebrow="Workspace Setup"
      title="İlk kurulumu tamamla"
      description="Çalışma alanının işletme profilini, kullanım bağlamını ve varsayılan güvenlik kurulumunu birkaç adımda hazırla."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{selectedUsage}</Badge>
            <Badge variant="outline">{defaultCurrency}</Badge>
            <Badge variant="outline">{cloudMode}</Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Kurulum tercihleri güvenli çalışma alanı ayarlarına yazılır ve ilk operasyon bağlamını belirler.</p>
        </div>
      }
      sideTitle="Çalışma alanını dashboard öncesi profesyonel şekilde hazırla"
      sideDescription="İlk giriş deneyimi; işletme profili, operasyon tipi, bölgesel bağlam ve güvenlik varsayılanlarıyla tamamlanır. Kurulum sonrası kullanıcı doğrudan dashboard’a yönlendirilir."
    >
      <div className="space-y-4">
        {error ? <AuthMessage tone="critical" title="Kurulum tamamlanamadı" description={error} /> : null}

        <div className="grid gap-3 lg:grid-cols-3">
          {[
            "İşletme profili",
            "Operasyon bağlamı",
            "Güvenlik varsayılanları",
          ].map((item, index) => (
            <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Adım {index + 1}</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{item}</p>
            </div>
          ))}
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();

            if (!organizationName.trim() || !city.trim()) {
              setError("İşletme adı ve şehir alanlarını doldur.");
              return;
            }

            if (!frameworks.length) {
              setError("En az bir uyumluluk çerçevesi seç.");
              return;
            }

            setIsSubmitting(true);
            void completeOnboarding({
              organizationName,
              city,
              usageType,
              defaultCurrency,
              cloudMode,
              complianceFrameworks: frameworks,
              seedDemoData,
              runInitialScan,
            }).then((success) => {
              setIsSubmitting(false);

              if (success) {
                router.replace("/dashboard");
              }
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">İşletme adı</Label>
              <Input
                id="org-name"
                value={organizationName}
                onChange={(event) => {
                  setOrganizationName(event.target.value);
                  setError(null);
                }}
                placeholder="AstraSec Financial Cloud Lab"
                className="h-11 rounded-xl px-3.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-city">Şehir</Label>
              <Input
                id="org-city"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setError(null);
                }}
                placeholder="İstanbul"
                className="h-11 rounded-xl px-3.5"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
            <div className="space-y-2">
              <Label>Kullanım tipi</Label>
              <Select value={usageType} onValueChange={(value) => setUsageType(value as typeof usageType)}>
                <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
                  <SelectValue placeholder="Kullanım tipi seç" />
                </SelectTrigger>
                <SelectContent>
                  {usageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Varsayılan para birimi</Label>
              <Select value={defaultCurrency} onValueChange={(value) => setDefaultCurrency(value as typeof defaultCurrency)}>
                <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
                  <SelectValue placeholder="Para birimi seç" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Bulut dağılım modeli</Label>
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
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3"
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
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{framework}</p>
                    <p className="text-xs text-[var(--text-muted)]">Kurulum sonrası görünürlükte kullanılacak.</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
              <Checkbox checked={seedDemoData} onCheckedChange={(checked) => setSeedDemoData(Boolean(checked))} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Başlangıç güvenlik paketi oluştur</p>
                <p className="text-xs text-[var(--text-muted)]">İlk çalışma alanı için örnek varlıklar, entegrasyonlar ve görünürlük kartları hazır gelsin.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
              <Checkbox checked={runInitialScan} onCheckedChange={(checked) => setRunInitialScan(Boolean(checked))} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">İlk güvenlik taramasını başlat</p>
                <p className="text-xs text-[var(--text-muted)]">Risk ve compliance kartları ilk girişte otomatik hazırlansın.</p>
              </div>
            </label>
          </div>

          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-[var(--surface)]">
                <CircleCheckBigIcon className="size-4 text-cyan-300" />
              </div>
              <div className="space-y-2 text-sm leading-6 text-cyan-100">
                <p className="font-medium">Kurulum özeti</p>
                <p>
                  <span className="font-semibold">{organizationName || "Çalışma alanı"}</span> için{" "}
                  <span className="font-semibold">{cloudMode}</span> profili,{" "}
                  <span className="font-semibold">{selectedUsage}</span> kullanım bağlamı ve{" "}
                  <span className="font-semibold">{defaultCurrency}</span> varsayılanı hazırlanacak.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="h-11 rounded-xl px-5" disabled={isSubmitting}>
              {isSubmitting ? "Kurulum hazırlanıyor..." : "Onboarding’i tamamla"}
              {!isSubmitting ? <ArrowRightIcon /> : null}
            </Button>
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => router.replace("/dashboard")}>
              Şimdilik geç
            </Button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
