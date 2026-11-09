// Controller for the Oven Temperature Converter.
// State machine: empty / dirty / busy / success / error / cancelled.
// The core run is synchronous and pure; the controller executes the
// snapshot on the next event-loop turn under a generation counter, so a
// cancelled, edited, replaced or disposed generation can never publish a
// late result. No Worker, no fake progress.

import { run } from './core/convert.mjs';

export const DEFAULT_DRAFT = Object.freeze({
  value: '180',
  unit: 'celsius',
  basis: 'conventional',
});

export function createController(options = {}) {
  const schedule = options.schedule ?? ((fn) => setTimeout(fn, 0));
  const onChange = options.onChange ?? (() => {});

  let generation = 0;
  let state = 'empty';
  let draft = { ...DEFAULT_DRAFT };
  let result = null;
  let error = null;

  function snapshot() {
    return {
      state,
      draft: { ...draft },
      result,
      error,
      resultAvailable: state === 'success' && result !== null,
    };
  }

  function emit() {
    onChange(snapshot());
  }

  function start(nextDraft) {
    if (nextDraft !== undefined) draft = { ...nextDraft };
    generation += 1;
    const gen = generation;
    const jobDraft = { ...draft };
    state = 'busy';
    result = null;
    error = null;
    emit();
    schedule(() => {
      if (gen !== generation || state !== 'busy') return; // stale: drop
      const outcome = run(jobDraft);
      if (outcome.ok) {
        result = outcome.result;
        error = null;
        state = 'success';
      } else {
        result = null;
        error = outcome.error;
        state = 'error';
      }
      emit();
    });
    return gen;
  }

  function edit(nextDraft) {
    draft = { ...nextDraft };
    generation += 1; // invalidate any pending work and any old result
    result = null;
    error = null;
    state = 'dirty';
    emit();
  }

  function cancel() {
    if (state !== 'busy') return;
    generation += 1;
    result = null;
    error = null;
    state = 'cancelled';
    emit();
  }

  function reset() {
    generation += 1;
    draft = { ...DEFAULT_DRAFT };
    result = null;
    error = null;
    state = 'empty';
    emit();
  }

  function dispose() {
    generation += 1;
  }

  return { start, edit, cancel, reset, dispose, snapshot };
}
