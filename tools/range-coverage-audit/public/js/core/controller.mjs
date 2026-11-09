// Pure controller state machine for Numeric Range Coverage Audit.
// No DOM, network, or storage access. The async work is injected as a
// `runner(snapshot, generation)` function returning a promise of a
// runAudit-shaped outcome {ok, result?, error?}; the app wires it to the
// module Worker, tests wire it to a controllable fake. A `cancelWork`
// callback (optional) is invoked whenever in-flight work must be terminated
// (cancel, reset, or an edit while busy).
//
// States (SPEC userFlow): empty, dirty, busy, success, error, cancelled.
// Every generation bump invalidates older work: late results are ignored and
// can never resurrect a superseded result or error.

export const DEFAULT_DRAFT = Object.freeze({ start: '0', end: '10', intervals: '' });

export const WORKER_ERROR = Object.freeze({ code: 'WORKER_ERROR', field: null, row: null });

export class AuditController {
  constructor({ runner, onCancelWork } = {}) {
    if (typeof runner !== 'function') throw new TypeError('runner is required');
    this.runner = runner;
    this.onCancelWork = typeof onCancelWork === 'function' ? onCancelWork : null;
    this.generation = 0;
    this.state = 'empty';
    this.draft = { ...DEFAULT_DRAFT };
    this.result = null;
    this.error = null;
    this.listeners = new Set();
  }

  get reportAvailable() {
    return this.state === 'success' && this.result !== null;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this);
  }

  // Any draft change revokes the old result and download. While busy it also
  // terminates the old work and moves to dirty.
  setDraft(next) {
    if (this.state === 'busy') {
      this.generation += 1;
      if (this.onCancelWork) this.onCancelWork();
    }
    this.draft = { ...next };
    this.result = null;
    this.error = null;
    this.state = 'dirty';
    this.emit();
  }

  loadExample(draft) {
    if (this.state === 'busy') {
      this.generation += 1;
      if (this.onCancelWork) this.onCancelWork();
    }
    this.draft = { ...draft };
    this.result = null;
    this.error = null;
    this.state = 'dirty';
    this.emit();
  }

  async run() {
    if (this.state === 'busy') return false;
    const snapshot = { ...this.draft };
    const generation = this.generation + 1;
    this.generation = generation;
    this.state = 'busy';
    this.result = null;
    this.error = null;
    this.emit();
    let outcome;
    try {
      outcome = await this.runner(snapshot, generation);
    } catch {
      outcome = { ok: false, error: WORKER_ERROR };
    }
    // Late results (superseded generation, or no longer busy) are dropped.
    if (generation !== this.generation || this.state !== 'busy') return false;
    if (outcome && outcome.ok) {
      this.state = 'success';
      this.result = outcome.result;
      this.error = null;
    } else {
      this.state = 'error';
      this.result = null;
      this.error = (outcome && outcome.error) || WORKER_ERROR;
    }
    this.emit();
    return true;
  }

  cancel() {
    if (this.state !== 'busy') return false;
    this.generation += 1;
    if (this.onCancelWork) this.onCancelWork();
    this.state = 'cancelled';
    this.result = null;
    this.error = null;
    this.emit();
    return true;
  }

  reset() {
    this.generation += 1;
    if (this.onCancelWork) this.onCancelWork();
    this.draft = { ...DEFAULT_DRAFT };
    this.state = 'empty';
    this.result = null;
    this.error = null;
    this.emit();
  }
}
