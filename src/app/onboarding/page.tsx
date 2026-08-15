"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CircleCheckBigIcon } from "lucide-react";

import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
const stepLabels = ["İşletme profili", "Operasyon bağlamı", "Güvenlik varsayılanları"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, currentOrganization } = useDemo();
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  function goBack() {
    setError(null);
    setStep((step - 1) as 1 | 2);
  }

  return (
    <AuthShell
      eyebrow="Workspace Setup"
      title="İlk kurulumu tamamla"
      description="İşletme profilini ve güvenlik varsayılanlarını üç kısa adımda hazırla."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{selectedUsage}</Badge>
            <Badge variant="outline">{defaultCurrency}</Badge>
            <Badge variant="outline">{cloudMode}</Badge>
          </div>
          <p className="auth-compact-hide text-xs text-[var(--text-muted)]">Tercihler güvenli başlangıç ayarlarına yazılır.</p>
        </div>
      }
      sideTitle="Çalışma alanını dashboard öncesi profesyonel şekilde hazırla"
      sideDescription="İşletme profili, operasyon tipi ve güvenlik varsayılanları tek görünümde, taşmadan tamamlanır."
    >
      <div className="space-y-3">
        {error ? <AuthMessage tone="critical" title="Kurulum tamamlanamadı" description={error} /> : null}

        <div className="grid grid-cols-3 gap-2" aria-label={`Kurulum adımı ${step}/3`}>
          {stepLabels.map((item, index) => (
            <div
              key={item}
              className={`rounded-xl border px-3 py-2 ${step === index + 1 ? "border-cyan-500/35 bg-cyan-500/10" : "border-[var(--border)] bg-[var(--surface-elevated)]"}`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{index + 1}/3</p>
              <p className="mt-1 truncate text-xs font-medium text-[var(--text-primary)]">{item}</p>
            </div>
          ))}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 1 && (!organizationName.trim() || !city.trim())) {
              setError("İşletme adı ve şehir alanlarını doldur.");
              return;
            }
            if (step === 2 && !frameworks.length) {
              setError("En az bir uyumluluk çerçevesi seç.");
              return;
            }
            if (step < 3) {
              setError(null);
              setStep((step + 1) as 2 | 3);
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
              if (success) router.replace("/dashboard");
            });
          }}
        >
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">İşletme adı</Label>
                  <Input id="org-name" value={organizationName} onChange={(event) => { setOrganizationName(event.target.value); setError(null); }} placeholder="AstraSec Financial Cloud Lab" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-city">Şehir</Label>
                  <Input id="org-city" value={city} onChange={(event) => { setCity(event.target.value); setError(null); }} placeholder="İstanbul" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kullanım tipi</Label>
                  <Select value={usageType} onValueChange={(value) => setUsageType(value as typeof usageType)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Kullanım tipi seç" /></SelectTrigger>
                    <SelectContent>{usageOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Varsayılan para birimi</Label>
                  <Select value={defaultCurrency} onValueChange={(value) => setDefaultCurrency(value as typeof defaultCurrency)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Para birimi seç" /></SelectTrigger>
                    <SelectContent>{currencyOptions.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <AuthMessage tone="info" title="İşletme bağlamı" description="Bu bilgiler panel varsayılanlarını ve bölgesel raporlamayı belirler." />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Bulut dağılım modeli</Label>
                <SegmentedControl value={cloudMode} onChange={(value) => setCloudMode(value as (typeof cloudModes)[number])} options={cloudModes.map((mode) => ({ value: mode, label: mode }))} />
              </div>
              <div className="space-y-3">
                <Label>Uyumluluk çerçeveleri</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {frameworkOptions.map((framework) => (
                    <label key={framework} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5">
                      <Checkbox checked={frameworks.includes(framework)} onCheckedChange={(checked) => setFrameworks((current) => checked ? Array.from(new Set([...current, framework])) : current.filter((item) => item !== framework))} />
                      <p className="text-sm font-medium text-[var(--text-primary)]">{framework}</p>
                    </label>
                  ))}
                </div>
              </div>
              <AuthMessage tone="info" title="Politika temeli" description="Seçimler uyumluluk kartlarını ve ilk kontrol setini hazırlar." />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3">
                <Checkbox checked={seedDemoData} onCheckedChange={(checked) => setSeedDemoData(Boolean(checked))} />
                <div><p className="text-sm font-medium text-[var(--text-primary)]">Başlangıç güvenlik paketi</p><p className="text-xs text-[var(--text-muted)]">Örnek varlık ve görünürlük kartları oluşturulur.</p></div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3">
                <Checkbox checked={runInitialScan} onCheckedChange={(checked) => setRunInitialScan(Boolean(checked))} />
                <div><p className="text-sm font-medium text-[var(--text-primary)]">İlk güvenlik taraması</p><p className="text-xs text-[var(--text-muted)]">Risk ve uyumluluk kartları ilk girişte hazırlanır.</p></div>
              </label>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-3">
                <div className="flex items-start gap-3">
                  <CircleCheckBigIcon className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                  <p className="text-sm leading-6 text-cyan-100"><strong>{organizationName || "Çalışma alanı"}</strong> · {cloudMode} · {selectedUsage} · {defaultCurrency} · {frameworks.length} çerçeve</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={goBack}><ArrowLeftIcon /> Geri</Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => router.replace("/dashboard")}>Şimdilik geç</Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Kurulum hazırlanıyor..." : step === 3 ? "Kurulumu tamamla" : "Devam et"}
              {!isSubmitting ? <ArrowRightIcon /> : null}
            </Button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
