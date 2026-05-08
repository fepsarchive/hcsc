"use client";

import { useEffect } from "react";

import { useSecurityConsoleStore } from "@/store/security-console-store";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { auth, hydrateAuthSession, hydrateFromApi } = useSecurityConsoleStore((state) => ({
    auth: state.auth,
    hydrateAuthSession: state.hydrateAuthSession,
    hydrateFromApi: state.hydrateFromApi,
  }));

  useEffect(() => {
    void hydrateAuthSession();
  }, [hydrateAuthSession]);

  useEffect(() => {
    if (!auth.hydrated || !auth.isAuthenticated || !auth.is2FAVerified) {
      return;
    }

    void hydrateFromApi();
  }, [auth.hydrated, auth.is2FAVerified, auth.isAuthenticated, hydrateFromApi]);

  return <>{children}</>;
}

export function useDemo() {
  return useSecurityConsoleStore();
}
