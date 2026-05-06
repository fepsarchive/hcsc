"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium transition",
            value === option.value ? "bg-cyan-400/15 text-white" : "text-slate-400 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
