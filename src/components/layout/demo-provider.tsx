"use client";

import { useSecurityConsoleStore } from "@/store/security-console-store";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useDemo() {
  return useSecurityConsoleStore();
}
