import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-500">
        ⌕
      </span>
      <input
        className={cn(
          "h-8 w-full rounded-md border border-[#323237] bg-[#1c1c20] pl-8 pr-3 text-[13px] text-white outline-none transition placeholder:text-slate-500 focus:border-[#404049] focus:bg-[#202025]",
          className,
        )}
        {...props}
      />
    </div>
  );
}
