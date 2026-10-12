"use client";

import { useSyncExternalStore } from "react";
import { guidedRunStorageKey, readGuidedRun, transitionGuidedRun, type GuidedRunAction } from "@/lib/guided-run";
import { useSecurityConsoleStore } from "@/store/security-console-store";

const CHANGE_EVENT = "hcsc-guided-run-change";
// Used only in a browser if localStorage is blocked; never auth/session data.
const memory = new Map<string, string>();
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(CHANGE_EVENT, callback); };
}
function read(key: string) {
  try { return window.localStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; }
}

export function useGuidedRun() {
  const userId = useSecurityConsoleStore((state) => state.currentUser?.id ?? "anonymous");
  const organizationId = useSecurityConsoleStore((state) => state.currentOrganization.id);
  const stepCount = useSecurityConsoleStore((state) => state.environment.demoScenario.steps.length);
  const key = guidedRunStorageKey(userId, organizationId);
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const state = readGuidedRun(raw);
  function dispatch(action: GuidedRunAction) {
    const next = transitionGuidedRun(readGuidedRun(read(key)), action, stepCount);
    const value = JSON.stringify(next);
    memory.set(key, value);
    try { window.localStorage.setItem(key, value); } catch { /* Current-tab fallback. */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    if (!next.visible) {
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('button[aria-label="Guided Run öğreticisini aç"]')?.focus());
    }
  }
  return { ...state, dispatch };
}
