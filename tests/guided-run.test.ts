import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_GUIDED_RUN, guidedRunStorageKey, readGuidedRun, transitionGuidedRun } from "../src/lib/guided-run";

test("tutorial completes, stays hidden on reload, and can reopen from the beginning", () => {
  let state = INITIAL_GUIDED_RUN;
  state = transitionGuidedRun(state, "next", 2);
  assert.equal(state.visible, true);
  state = transitionGuidedRun(state, "next", 2);
  assert.deepEqual(state, { step: 1, visible: false, completed: true });
  assert.deepEqual(readGuidedRun(JSON.stringify(state)), state);
  assert.deepEqual(transitionGuidedRun(state, "open", 2), INITIAL_GUIDED_RUN);
  assert.equal(transitionGuidedRun(INITIAL_GUIDED_RUN, "previous", 2).step, 0);
  assert.equal(transitionGuidedRun(INITIAL_GUIDED_RUN, "close", 2).visible, false);
});

test("tutorial state is scoped by user and workspace and tolerates malformed browser storage", () => {
  assert.notEqual(guidedRunStorageKey("user1", "org1"), guidedRunStorageKey("user2", "org1"));
  assert.notEqual(guidedRunStorageKey("user1", "org1"), guidedRunStorageKey("user1", "org2"));
  for (const raw of [null, "invalid", "{}", '{"visible":true,"completed":false,"step":-1}']) assert.deepEqual(readGuidedRun(raw), INITIAL_GUIDED_RUN);
});
