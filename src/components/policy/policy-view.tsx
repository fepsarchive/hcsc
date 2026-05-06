"use client";

import { FormEvent, useState } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { ZeroTrustDecision } from "@/types";

export function PolicyView() {
  const { environment, togglePolicyRule, addPolicyRule } = useDemo();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [action, setAction] = useState("");
  const [decision, setDecision] = useState<ZeroTrustDecision>("require_step_up_auth");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !description.trim() || !condition.trim() || !action.trim()) {
      return;
    }
    addPolicyRule({
      name: name.trim(),
      description: description.trim(),
      defaultDecision: decision,
      severity,
      condition: condition.trim(),
      action: action.trim(),
    });
    setName("");
    setDescription("");
    setCondition("");
    setAction("");
    setDecision("require_step_up_auth");
    setSeverity("medium");
  };

  return (
    <div className="space-y-5">
      <Panel>
        <PageIntro
          eyebrow="NIST ZTA"
          title="Zero Trust Policy Engine"
          description="Bu sayfa, NIST Zero Trust Architecture içindeki Policy Engine, Policy Administrator ve Policy Enforcement Point mantığını görünür hale getirir; risk tabanlı erişim kararlarını ve politika kütüphanesini gösterir."
        />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        {[
          ["Policy Engine", "Kimlik, MFA, cihaz, veri hassasiyeti, konum ve zaman sinyallerinden karar üretir."],
          ["Policy Administrator", "Kararı aksiyona dönüştürür; playbook, step-up ve revoke önerilerini hazırlar."],
          ["Policy Enforcement Point", "Uygulama, API gateway ve veri katmanında kararı uygular."],
        ].map(([title, description]) => (
          <Panel key={title}>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-white">Kural listesi</h2>
          <div className="mt-5 space-y-3">
            {environment.policyRules.map((rule) => (
              <div key={rule.id} className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{rule.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{rule.description}</p>
                  </div>
                  <Button variant="secondary" onClick={() => togglePolicyRule(rule.id)}>
                    {rule.enabled ? "Devre Dışı" : "Etkinleştir"}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge label={rule.owner} tone="neutral" />
                  <Badge label={rule.defaultDecision} tone={rule.defaultDecision === "isolate" ? "critical" : rule.defaultDecision === "deny" ? "high" : "info"} />
                  <Badge label={rule.severity} tone={rule.severity === "critical" ? "critical" : rule.severity === "high" ? "high" : "medium"} />
                  <Badge label={rule.enabled ? "enabled" : "disabled"} tone={rule.enabled ? "low" : "neutral"} />
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-white">Koşullar</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                      {rule.conditions.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Aksiyonlar</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                      {rule.actions.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-white">Yeni mock kural ekle</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Local state tabanlı bu yapı ileride veritabanı veya API üzerinden yönetilebilir.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rule name" className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Açıklama" rows={3} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none" />
            <input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Condition" className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action" className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none" />
            <select value={decision} onChange={(event) => setDecision(event.target.value as ZeroTrustDecision)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none">
              <option value="allow">allow</option>
              <option value="limited_allow">limited_allow</option>
              <option value="require_step_up_auth">require_step_up_auth</option>
              <option value="deny">deny</option>
              <option value="isolate">isolate</option>
            </select>
            <select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
            <Button type="submit" className="w-full">
              Kuralı Ekle
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
