"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  "data-assets": "Veri Varlıkları",
  "access-requests": "Erişim Talepleri",
  "policy-engine": "Policy Engine",
  deception: "Deception",
  events: "Event Center",
  compliance: "Uyumluluk",
  "threat-matrix": "Threat Matrix",
  simulations: "Senaryolar",
  "cloud-map": "Cloud Map",
  reports: "Raporlar",
  presentation: "Executive Briefing",
  "final-checklist": "Platform Status",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.04em] text-slate-500">
      <span>HCSC</span>
      {parts.map((part) => (
        <span key={part} className="flex items-center gap-2">
          <span>/</span>
          <span>{labels[part] ?? part}</span>
        </span>
      ))}
    </div>
  );
}
