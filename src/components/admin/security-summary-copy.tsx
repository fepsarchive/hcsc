"use client";

import { useState } from "react";
import { ClipboardCheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SecuritySummaryCopy({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button variant="outline" onClick={() => void copy()}>
      {copied ? <ClipboardCheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy security summary"}
    </Button>
  );
}
