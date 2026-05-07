"use client";

import { useEffect } from "react";

import { useSecurityConsoleStore } from "@/store/security-console-store";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const hydrateAuthSession = useSecurityConsoleStore((state) => state.hydrateAuthSession);

  useEffect(() => {
    void hydrateAuthSession();
  }, [hydrateAuthSession]);

  return <>{children}</>;
}

export function useDemo() {
  return useSecurityConsoleStore();
}
