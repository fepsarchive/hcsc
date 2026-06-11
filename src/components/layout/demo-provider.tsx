"use client";

import { useEffect, useRef } from "react";

import { useSecurityConsoleStore } from "@/store/security-console-store";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const hydrateAuthSession = useSecurityConsoleStore((state) => state.hydrateAuthSession);
  const hasRequestedHydrationRef = useRef(false);

  useEffect(() => {
    if (hasRequestedHydrationRef.current || typeof window === "undefined") {
      return;
    }

    hasRequestedHydrationRef.current = true;
    void hydrateAuthSession();
  }, [hydrateAuthSession]);

  return <>{children}</>;
}

export function useDemo() {
  return useSecurityConsoleStore();
}
