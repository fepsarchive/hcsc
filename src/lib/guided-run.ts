export type GuidedRunState = { visible: boolean; step: number; completed: boolean };
export const INITIAL_GUIDED_RUN: GuidedRunState = { visible: true, step: 0, completed: false };
export type GuidedRunAction = "open" | "close" | "next" | "previous";

export function readGuidedRun(value: string | null): GuidedRunState {
  try {
    const state = JSON.parse(value ?? "null");
    if (state && typeof state.visible === "boolean" && typeof state.completed === "boolean" && Number.isSafeInteger(state.step) && state.step >= 0) {
      return { visible: state.visible, completed: state.completed, step: state.step };
    }
  } catch { /* Ignore unavailable or old browser state. */ }
  return INITIAL_GUIDED_RUN;
}

export function transitionGuidedRun(state: GuidedRunState, action: GuidedRunAction, stepCount: number): GuidedRunState {
  if (action === "open") return { visible: true, step: 0, completed: false };
  if (action === "close") return { ...state, visible: false };
  if (action === "previous") return { ...state, step: Math.max(0, state.step - 1) };
  if (state.step >= stepCount - 1) return { ...state, visible: false, completed: true };
  return { ...state, step: state.step + 1 };
}

export function guidedRunStorageKey(userId: string, organizationId: string) {
  return `hcsc-guided-run:v1:${encodeURIComponent(organizationId)}:${encodeURIComponent(userId)}`;
}
