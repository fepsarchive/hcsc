"use client";
import { useEffect, useState } from "react";

type Workspace = { role: string; organization: { id: string; name: string } };
export function WorkspaceSwitcher() {
  const [options, setOptions] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/workspaces", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const { data } = await response.json(); setOptions(data.memberships); setCurrent(data.currentOrganizationId);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (options.length < 2) return null;
  return <label className="flex items-center gap-3 border-b px-4 py-2 text-xs">Çalışma alanı
    <select value={current} disabled={busy} className="rounded border bg-background p-1" onChange={async (event) => {
      setBusy(true); setError("");
      try {
        const response = await fetch("/api/auth/workspaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId: event.target.value }) });
        if (!response.ok) throw new Error("Çalışma alanı değiştirilemedi.");
        // Full reload discards all previous tenant data and cached permissions.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- tenant isolation requires discarding the external store
        window.location.assign("/dashboard");
      } catch { setError("Çalışma alanı değiştirilemedi."); setBusy(false); }
    }}>{options.map((item) => <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>)}</select>
    {error && <span role="alert">{error}</span>}
  </label>;
}
