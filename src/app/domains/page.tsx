"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import type { DomainChecks } from "@/lib/domain-policy";

type Domain = {
  id: string; hostname: string; status: string; providerConnected: boolean;
  verifiedAt: string | null; lastCheckedAt: string | null;
  dnsRecord: { name: string; type: string; value: string };
  lastCheck: Partial<DomainChecks> | null;
};

const steps = ["Domain", "Sahiplik", "Koruma bağlantısı", "Doğrula ve etkinleştir"];
const fields: Array<[keyof DomainChecks, string]> = [["ownership", "DNS sahipliği"], ["zoneActive", "Aktif Cloudflare zone"], ["hostnameProxied", "Bu hostname için proxy"], ["strictTls", "Full (strict) TLS"], ["managedWafConfigured", "Managed WAF dağıtımı"]];

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error?.message ?? "Bağlantı başarısız.");
  return result.data;
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selected, setSelected] = useState("");
  const [hostname, setHostname] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const domain = domains.find((entry) => entry.id === selected);

  useEffect(() => {
    let active = true;
    api<Domain[]>("/api/domains").then((result) => { if (active) { setDomains(result); setSelected(result[0]?.id ?? ""); } }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  async function perform(body: unknown, create = false) {
    setBusy(true); setError("");
    try {
      const result = await api<Domain>(create ? "/api/domains" : `/api/domains/${selected}`, body);
      setDomains((current) => [result, ...current.filter((entry) => entry.id !== result.id)]);
      setSelected(result.id);
      if (create) setStep(1);
      setToken("");
    } catch (err) { setError(err instanceof Error ? err.message : "İşlem başarısız."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-3">
    <PageHeader eyebrow="Live onboarding" title="Domainini bağla" description="HCSC yapılandırmayı doğrular; trafik korumasını Cloudflare, yetkili açık testini Strix yürütür. Domain kaydı tek başına koruma değildir." />
    <nav aria-label="Domain kurulum adımları" className="flex flex-wrap gap-2">
      {steps.map((name, index) => <ActionButton key={name} variant={step === index ? "primary" : "secondary"} disabled={busy || (index > 0 && !domain)} onClick={() => setStep(index)}>{index + 1}. {name}</ActionButton>)}
    </nav>
    {error && <p role="alert" className="rounded-xl border border-red-500/30 p-3 text-sm">{error}</p>}
    <Panel>
      {domains.length > 0 && <label className="mb-4 block text-sm">Çalışma alanına bağlı domain
        <select className="ml-3 max-w-full rounded-lg border bg-background p-2" value={selected} disabled={busy} onChange={(event) => { setSelected(event.target.value); setToken(""); setZoneId(""); }}>
          {domains.map((entry) => <option value={entry.id} key={entry.id}>{entry.hostname}</option>)}
        </select>
      </label>}
      {step === 0 && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void perform({ hostname }, true); }}>
        <h2 className="text-xl font-medium">Kendi sitenle başla</h2>
        <p className="text-sm text-muted-foreground">Yalnızca sahibi olduğun veya yönetim iznin olan domaini ekle. Apex ve www gibi alt alanları ayrı doğrula. Bu akış DNS kayıtlarını değiştirmez ve saldırı testi başlatmaz.</p>
        <label className="block text-sm">Domain adı<input required autoComplete="off" placeholder="mertcanyildirim.com" value={hostname} onChange={(event) => setHostname(event.target.value)} className="mt-2 block w-full max-w-xl rounded-xl border bg-background p-3" /></label>
        <ActionButton type="submit" disabled={busy}>Domaini ekle</ActionButton>
      </form>}
      {step === 1 && domain && <div className="space-y-4">
        <h2 className="text-xl font-medium">DNS TXT ile sahipliği doğrula</h2>
        <p className="text-sm text-muted-foreground">DNS sağlayıcında yeni TXT kaydı ekle. Natro DNS kullanıyorsan domainin DNS yönetimi alanından ekleyebilirsin. Mevcut A, MX ve diğer kayıtları silme. Kayıt yayılımı tamamlanınca doğrula.</p>
        <label className="block text-sm">Kayıt adı<input readOnly value={domain.dnsRecord.name} className="mt-1 block w-full rounded-lg border bg-background p-2" /></label>
        <label className="block text-sm">TXT değeri<input readOnly value={domain.dnsRecord.value} className="mt-1 block w-full rounded-lg border bg-background p-2 font-mono text-xs" /></label>
        <p className="text-xs text-muted-foreground">Sağlayıcı domaini otomatik ekliyorsa ad alanına yalnızca _hcsc-verification yaz. TXT kaydını koru; sonraki kontrollerde tekrar okunur.</p>
        <ActionButton disabled={busy} onClick={() => void perform({ action: "verify" })}>Sahipliği doğrula</ActionButton>
        <p role="status" className="text-sm">{domain.verifiedAt ? "Sahiplik doğrulandı." : "DNS doğrulaması bekleniyor."}</p>
      </div>}
      {step === 2 && domain && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void perform({ action: "connect", zoneId, token }); }}>
        <h2 className="text-xl font-medium">Cloudflare koruma bağlantısı</h2>
        <p className="text-sm text-muted-foreground">Domain Natro’da kalabilir. Cloudflare’a ekle, web ve e-posta DNS kayıtlarını eksiksiz aktar, ardından Natro’da yalnızca Cloudflare’ın sana atadığı nameserver’ları gir. Mevcut DNSSEC için sağlayıcının geçiş talimatını izle.</p>
        <p className="text-sm text-muted-foreground">Web kaydında proxy’yi aç; origin sertifikasını doğrulayıp Full (strict) TLS ve planının desteklediği managed WAF’ı etkinleştir. HCSC mevcut kuralları değiştirmez.</p>
        <a className="text-sm text-cyan-400 underline" href="https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/" target="_blank" rel="noreferrer">Resmî DNS geçiş rehberi</a>
        <p className="text-xs text-muted-foreground">Yalnızca ilgili zone için Zone Read, DNS Read, Zone Settings Read, Zone WAF Read izinli token kullan. Token sunucuda şifrelenir, geri gösterilmez; sohbetle paylaşma.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Zone ID<input required value={zoneId} onChange={(event) => setZoneId(event.target.value)} className="mt-1 block w-full rounded-lg border bg-background p-2" /></label>
          <label className="text-sm">API token<input required type="password" autoComplete="new-password" value={token} onChange={(event) => setToken(event.target.value)} className="mt-1 block w-full rounded-lg border bg-background p-2" /></label>
        </div>
        <ActionButton type="submit" disabled={busy || !domain.verifiedAt}>Güvenli bağlantıyı kaydet</ActionButton>
        <span className="ml-3 text-sm">{domain.providerConnected ? "Sağlayıcı bağlı" : "Bağlantı bekleniyor"}</span>
      </form>}
      {step === 3 && domain && <div className="space-y-3">
        <h2 className="text-xl font-medium">Gerçek yapılandırma kontrolü</h2>
        <div className="grid gap-2 sm:grid-cols-2">{fields.map(([key, label]) => <div key={key} className="rounded-lg border p-2 text-sm">{domain.lastCheck?.[key] === true ? "✓" : "○"} {label}</div>)}</div>
        <p role="status" className="text-sm">{domain.lastCheck?.message ?? "Henüz kontrol çalıştırılmadı."}</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton disabled={busy} variant="secondary" onClick={() => void perform({ action: "check" })}>Kontrolleri çalıştır</ActionButton>
          <ActionButton disabled={busy} onClick={() => void perform({ action: "activate" })}>Doğrula ve bağlantıyı etkinleştir</ActionButton>
        </div>
        <p className="text-xs text-muted-foreground">Durum: {domain.status} • Son kontrol: {domain.lastCheckedAt ? new Date(domain.lastCheckedAt).toLocaleString("tr-TR") : "yok"}. Bu bir kontrol anı kaydıdır, kesintisiz izleme veya tam güvenlik garantisi değildir.</p>
        <Link href="/adversary-validation" className="block text-sm text-cyan-400 underline">Sonraki adım: Strix için ayrı sahiplik, kapsam ve test izni</Link>
      </div>}
    </Panel>
  </div>;
}
