// Draft / work-generation controller for the Tap Tempo BPM detector.
// No DOM access: the app wires this to the tap surface and the import
// form; evaluation is scheduled through the injected scheduler (a
// macrotask in the app, a controllable fake in tests) and every
// evaluation carries a generation number.
//
// States (SPEC userFlow): empty, tapping, dirty, busy, success, error,
// cancelled.
// - tap() appends a live timestamp (same-or-earlier timestamps are
//   dropped here, so real input never breaks the core's strict-increase
//   contract), revokes the old reading, and schedules a re-evaluation.
// - runImport() enters busy and schedules parse + core evaluation of the
//   import text snapshot. Success replaces the live tap array; failure
//   leaves it untouched.
// - Editing the import text, undoing, resetting, or a new tap terminates
//   pending work. settle() only accepts the currently pending generation,
//   so a late completion can never resurrect a revoked reading.

import { parseImportText, run } from "./core/tempo.mjs";

export function createController({ schedule, cancelScheduled, onChange = () => {} } = {}) {
  const scheduleFn = schedule ?? ((fn) => setTimeout(fn, 0));
  const cancelFn = cancelScheduled ?? ((handle) => clearTimeout(handle));

  let generation = 0;
  let state = "empty";
  let taps = [];
  let importText = "";
  let result = null;
  let error = null;
  let pendingHandle = null;
  let pendingGeneration = null;
  let pendingKind = null;

  function getPublicState() {
    return {
      state,
      taps: [...taps],
      importText,
      result,
      error,
      generation,
      tapCount: taps.length,
      intervalCount: result !== null ? result.intervalCount : 0,
      bpmMedian: result !== null ? result.bpmMedian : null,
      resetCount: result !== null ? result.resetCount : 0,
      downloadAvailable:
        (state === "success" || state === "tapping") &&
        result !== null &&
        result.intervalCount >= 1,
    };
  }

  function emit() {
    onChange(getPublicState());
  }

  function stopPending() {
    if (pendingHandle !== null) {
      try {
        cancelFn(pendingHandle);
      } catch {
        // Cancelling an already-fired timer is not an error state.
      }
      pendingHandle = null;
    }
    pendingGeneration = null;
    pendingKind = null;
  }

  function invalidateOutcome() {
    result = null;
    error = null;
  }

  function evaluateImport(text) {
    const parsed = parseImportText(text);
    if (!parsed.ok) return parsed;
    const outcome = run({ taps: parsed.taps });
    if (!outcome.ok) return outcome;
    return { ok: true, result: outcome.result, parsedTaps: parsed.taps };
  }

  function scheduleEvaluation(kind, gen) {
    const snapshot =
      kind === "live" ? { taps: [...taps] } : { text: importText };
    pendingGeneration = gen;
    pendingKind = kind;
    pendingHandle = scheduleFn(() => {
      pendingHandle = null;
      const outcome =
        kind === "live" ? run({ taps: snapshot.taps }) : evaluateImport(snapshot.text);
      settle(gen, outcome);
    });
  }

  // Completion entry point. The scheduled evaluation calls this, and
  // tests use it to inject late completions: anything that is not the
  // currently pending generation is dropped silently.
  function settle(gen, outcome) {
    if (pendingKind === null || gen !== pendingGeneration) return getPublicState();
    const kind = pendingKind;
    pendingGeneration = null;
    pendingKind = null;
    if (outcome !== null && typeof outcome === "object" && outcome.ok === true) {
      if (kind === "import" && Array.isArray(outcome.parsedTaps)) {
        taps = [...outcome.parsedTaps];
      }
      result = outcome.result;
      error = null;
      state = kind === "import" ? "success" : "tapping";
    } else {
      result = null;
      error =
        outcome !== null && typeof outcome === "object" && outcome.error
          ? outcome.error
          : { code: "INTERNAL", field: null, row: null };
      state = "error";
    }
    emit();
    return getPublicState();
  }

  function tap(timestamp) {
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
      return getPublicState();
    }
    if (taps.length > 0 && timestamp <= taps[taps.length - 1]) {
      return getPublicState();
    }
    generation += 1;
    stopPending();
    invalidateOutcome();
    taps.push(timestamp);
    state = "tapping";
    scheduleEvaluation("live", generation);
    emit();
    return getPublicState();
  }

  function undo() {
    if (taps.length === 0) return getPublicState();
    generation += 1;
    stopPending();
    invalidateOutcome();
    taps.pop();
    if (taps.length === 0) {
      state = "empty";
    } else {
      state = "tapping";
      scheduleEvaluation("live", generation);
    }
    emit();
    return getPublicState();
  }

  function editImport(text) {
    const nextText = typeof text === "string" ? text : "";
    if (nextText === importText) {
      emit();
      return getPublicState();
    }
    importText = nextText;
    if (state === "busy") {
      generation += 1;
      stopPending();
      invalidateOutcome();
      state = "dirty";
    } else if (state === "success" || state === "error") {
      invalidateOutcome();
      state = "dirty";
    }
    emit();
    return getPublicState();
  }

  function runImport() {
    if (state === "busy") return getPublicState();
    generation += 1;
    stopPending();
    invalidateOutcome();
    state = "busy";
    scheduleEvaluation("import", generation);
    emit();
    return getPublicState();
  }

  function cancel() {
    if (state !== "busy") return getPublicState();
    generation += 1;
    stopPending();
    invalidateOutcome();
    state = "cancelled";
    emit();
    return getPublicState();
  }

  function reset() {
    generation += 1;
    stopPending();
    invalidateOutcome();
    taps = [];
    importText = "";
    state = "empty";
    emit();
    return getPublicState();
  }

  function destroy() {
    generation += 1;
    stopPending();
  }

  return {
    tap,
    undo,
    editImport,
    runImport,
    cancel,
    reset,
    destroy,
    settle,
    getState: getPublicState,
  };
}
