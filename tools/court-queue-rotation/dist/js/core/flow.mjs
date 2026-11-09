// Pure flow controller for Drop-In Court Queue (spec-court-queue-rotation-20261109).
// No DOM / network / storage access. The app drives it: edit on every form
// change, run + settle (via the next event-loop work item) on submit, cancel
// while busy, reset on clear. settle() delivers the solve() reply for the
// draft captured by run(); a stale runId can never overwrite newer state.
//
// Phases: empty -> dirty -> busy -> ready | error; cancel returns to dirty;
// reset returns to empty; loading the fixed sample leaves the draft dirty.
// snapshot() compares exactly {phase, result}: only ready carries the
// current valid result. The current error (if any) is available via
// getError() for the app to render with field links.

import { solve } from "./solve.mjs";

export function createFlow() {
  let phase = "empty";
  let draft = null;
  let captured = null;
  let result = null;
  let error = null;
  let runId = null;

  function invalidate() {
    captured = null;
    runId = null;
  }

  return {
    snapshot() {
      return { phase, result };
    },
    getError() {
      return error;
    },
    getDraft() {
      return draft;
    },
    isBusy() {
      return phase === "busy";
    },

    // A form edit replaces the draft, clears the old result and any error,
    // and invalidates the running runId at once.
    edit(nextDraft) {
      draft = nextDraft;
      captured = null;
      result = null;
      error = null;
      runId = null;
      phase = "dirty";
    },

    // Loading the fixed sample is still a draft, not a result.
    loadSample(sample) {
      this.edit(sample);
    },

    // Start a run for the current draft. Ignored while busy, or with no
    // draft to run (empty phase).
    run(id) {
      if (phase === "busy" || phase === "empty") return;
      captured = draft;
      runId = id;
      phase = "busy";
    },

    // Deliver the solve() reply for the captured draft. Only the live runId
    // while busy settles; stale or late replies (including a stale error
    // reply) are dropped.
    settle(id) {
      if (phase !== "busy" || id !== runId) return;
      const reply = solve(captured);
      invalidate();
      if (reply.status === "ok") {
        result = reply.result;
        error = null;
        phase = "ready";
      } else {
        result = null;
        error = reply.error;
        phase = "error";
      }
    },

    // A raw form syntax error (SYNTAX) is reported directly: the draft is
    // kept, the result is cleared, and the runId is invalidated.
    reportFormError(formError) {
      if (phase === "busy") return;
      result = null;
      error = formError;
      invalidate();
      phase = "error";
    },

    // Cancel a busy run: back to dirty, draft kept, no result.
    cancel() {
      if (phase !== "busy") return;
      invalidate();
      phase = "dirty";
    },

    // Clear draft, result, error and runId; focus returns to the first field.
    reset() {
      draft = null;
      invalidate();
      result = null;
      error = null;
      phase = "empty";
    },
  };
}
