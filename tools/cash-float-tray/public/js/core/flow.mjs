// Pure run-state machine for Cash Float Tray (SPEC userFlow).
// Phases: empty -> dirty -> busy -> ready | error; cancel returns busy to
// dirty and invalidates the active runId; a late settle for a superseded
// runId is ignored. No DOM, network or storage imports.
//
// The machine is generic over the draft the caller edits (opaque to it) and
// the core input handed to run(); callers pass the same core-shaped object
// for both when driving the SPEC's literal flow fixtures.

export function createFlow({ validate, solve }) {
  let phase = 'empty';
  let draft = null;
  let result = null;
  let error = null;
  let activeRunId = null;
  let pending = null; // { runId, coreInput }

  function snapshot() {
    return {
      phase,
      draft: draft === null ? null : JSON.parse(JSON.stringify(draft)),
      result: result === null ? null : JSON.parse(JSON.stringify(result)),
      error: error === null ? null : { ...error },
      activeRunId,
    };
  }

  // Replace the draft. Any edit clears the old result/error and invalidates
  // the active runId. A null draft means the form is fully blank (empty).
  function edit(nextDraft) {
    draft = nextDraft === null || nextDraft === undefined
      ? null
      : JSON.parse(JSON.stringify(nextDraft));
    result = null;
    error = null;
    activeRunId = null;
    pending = null;
    phase = draft === null ? 'empty' : 'dirty';
    return snapshot();
  }

  // Start a run. Re-submit while busy is ignored. An invalid core input
  // goes to error immediately; a valid one goes to busy and waits for
  // settle(runId). coreInput defaults to the edited draft.
  function run(runId, coreInput) {
    if (phase === 'busy') return snapshot();
    const input = coreInput === undefined ? draft : coreInput;
    if (input === null || input === undefined) {
      phase = 'error';
      error = { code: 'REQUIRED', path: '/targetMinor' };
      result = null;
      return snapshot();
    }
    const invalid = validate(input);
    if (invalid) {
      phase = 'error';
      error = invalid.error;
      result = null;
      return snapshot();
    }
    phase = 'busy';
    activeRunId = runId;
    pending = { runId, coreInput: JSON.parse(JSON.stringify(input)) };
    return snapshot();
  }

  // Deliver a run's solve reply. Only the currently busy runId settles;
  // older or foreign runIds are ignored.
  function settle(runId) {
    if (phase !== 'busy' || activeRunId !== runId || pending === null) {
      return snapshot();
    }
    const reply = solve(pending.coreInput);
    activeRunId = null;
    pending = null;
    if (reply.status === 'error') {
      phase = 'error';
      error = reply.error;
      result = null;
    } else {
      phase = 'ready';
      result = reply.result;
      error = null;
    }
    return snapshot();
  }

  // Cancel the active run; the draft is kept and the phase returns to dirty.
  function cancel() {
    if (phase !== 'busy') return snapshot();
    phase = 'dirty';
    activeRunId = null;
    pending = null;
    result = null;
    return snapshot();
  }

  // Enter the error phase from the outside (e.g. form-level field errors
  // found before the core ever runs). The draft is kept.
  function fail(errorInfo) {
    if (phase === 'busy') return snapshot();
    phase = 'error';
    error = { ...errorInfo };
    result = null;
    return snapshot();
  }

  function reset() {
    phase = 'empty';
    draft = null;
    result = null;
    error = null;
    activeRunId = null;
    pending = null;
    return snapshot();
  }

  return { snapshot, edit, run, settle, cancel, fail, reset };
}
