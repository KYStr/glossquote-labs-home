// Pure flow controller for Loan Kit Turnover Check (SPEC.md userFlow +
// tests). No DOM / network / storage access. Directly importable by
// node --test.
//
// Phases: empty -> dirty -> busy -> ready | error; cancel returns to
// dirty and keeps the draft; edit invalidates the active runId and clears
// the result; reset returns to empty. A settle only takes effect when its
// runId matches the active run and the phase is still busy, so a late
// reply from an older run can never overwrite a newer state.
// run(runId) captures the current draft; settle(runId) delivers that
// run's solve reply. Snapshot shape is {phase, result, error}; result is
// only present while phase is "ready".

import { solve } from "./solve.mjs";

export function createFlow() {
  let phase = "empty";
  let draft = null;
  let capturedDraft = null;
  let activeRunId = null;
  let result = null;
  let error = null;

  function snapshot() {
    return { phase, result, error };
  }

  // Replace the draft. Any edit clears the old result and its
  // interactions and invalidates the active runId.
  function edit(nextDraft) {
    draft = nextDraft;
    capturedDraft = null;
    activeRunId = null;
    result = null;
    error = null;
    phase = "dirty";
  }

  // Start a run for the current draft. A resubmit while busy is ignored.
  function run(runId) {
    if (phase === "busy" || draft === null) return;
    capturedDraft = draft;
    activeRunId = runId;
    result = null;
    error = null;
    phase = "busy";
  }

  // Deliver a run's solve reply. Only the matching runId while still
  // busy settles; anything else (cancelled run, superseded run, late
  // reply) is discarded. A core error settles as phase "error".
  function settle(runId) {
    if (phase !== "busy" || runId !== activeRunId) return;
    settleWith(runId, solve(capturedDraft));
  }

  // Same guard as settle, but applies a reply delivered by an external
  // executor instead of computing solve here. Used by the app's
  // setTimeout(0) executor and by tests for stale-reply cases.
  function settleWith(runId, reply) {
    if (phase !== "busy" || runId !== activeRunId) return;
    capturedDraft = null;
    activeRunId = null;
    if (reply.status === "ok") {
      result = reply.result;
      error = null;
      phase = "ready";
    } else {
      result = null;
      error = reply.error;
      phase = "error";
    }
  }

  // Cancel the active run; the draft stays editable. Cancelling while
  // not busy is a no-op.
  function cancel() {
    if (phase !== "busy") return;
    capturedDraft = null;
    activeRunId = null;
    result = null;
    error = null;
    phase = "dirty";
  }

  // Clear draft, result and error; back to the initial empty phase.
  function reset() {
    draft = null;
    capturedDraft = null;
    activeRunId = null;
    result = null;
    error = null;
    phase = "empty";
  }

  // Enter the error phase directly (form submit validation failure):
  // the draft is kept, the result is cleared, no run is active.
  function fail(errorValue) {
    capturedDraft = null;
    activeRunId = null;
    result = null;
    error = errorValue;
    phase = "error";
  }

  return { snapshot, edit, run, settle, settleWith, cancel, reset, fail };
}
