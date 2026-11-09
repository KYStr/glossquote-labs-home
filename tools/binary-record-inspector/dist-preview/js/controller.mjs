// Draft / generation controller for Binary Record Inspector.
// Pure state machine over an injected worker factory; no DOM here.
// States: empty, dirty, busy, success, error, cancelled.
//
// The worker is created per run and terminated on cancel, edit, reset, or
// after a result arrives. Only a message whose generation matches the
// current generation and arrives while busy is accepted; late messages from
// an older generation are discarded and can never resurrect a stale result.

import { serializeReport } from './core/inspector.mjs';

export const DEFAULT_DRAFT = Object.freeze({ hex: '', layout: '' });

// fixtures.json, first synthetic case (endian-and-sign).
export const EXAMPLE_DRAFT = Object.freeze({
  hex: 'FF 80 00 01',
  layout: 'a\t0\tu16be\nb\t0\tu16le\nc\t1\ti8',
});

export class Controller {
  constructor({ createWorker }) {
    if (typeof createWorker !== 'function') {
      throw new TypeError('createWorker is required');
    }
    this._createWorker = createWorker;
    this._generation = 0;
    this._worker = null;
    this._draft = { ...DEFAULT_DRAFT };
    this._state = 'empty';
    this._result = null;
    this._error = null;
    this._reportText = null;
    this.onchange = null;
  }

  get state() {
    return this._state;
  }

  get draft() {
    return { ...this._draft };
  }

  get result() {
    return this._result;
  }

  get error() {
    return this._error;
  }

  get reportText() {
    return this._reportText;
  }

  get reportAvailable() {
    return this._state === 'success' && this._reportText !== null;
  }

  _emit() {
    if (typeof this.onchange === 'function') this.onchange(this._state);
  }

  _terminateWorker() {
    if (this._worker !== null) {
      try {
        this._worker.terminate();
      } catch {
        // Termination is best-effort; the generation guard still applies.
      }
      this._worker = null;
    }
  }

  _invalidate() {
    this._result = null;
    this._error = null;
    this._reportText = null;
  }

  // Any draft change invalidates the old result and download at once.
  // An empty default draft returns to the empty state; anything else is dirty.
  setDraft(draft) {
    const next = {
      hex: String(draft && draft.hex !== undefined ? draft.hex : ''),
      layout: String(draft && draft.layout !== undefined ? draft.layout : ''),
    };
    this._terminateWorker();
    this._generation += 1;
    this._draft = next;
    this._invalidate();
    this._state = next.hex === '' && next.layout === '' ? 'empty' : 'dirty';
    this._emit();
  }

  loadExample() {
    this.setDraft(EXAMPLE_DRAFT);
  }

  run() {
    this._terminateWorker();
    this._generation += 1;
    const generation = this._generation;
    const snapshot = { ...this._draft };
    this._invalidate();
    this._state = 'busy';
    this._emit();
    let worker;
    try {
      worker = this._createWorker();
    } catch {
      this._state = 'error';
      this._error = { code: 'WORKER_ERROR', field: null, row: null };
      this._emit();
      return;
    }
    this._worker = worker;
    worker.onmessage = (event) => {
      const data = event && event.data;
      if (!data || data.generation !== generation) return;
      if (this._state !== 'busy') return;
      this._terminateWorker();
      if (data.ok) {
        const serialized = serializeReport(data.result);
        if (!serialized.ok) {
          this._state = 'error';
          this._error = serialized.error;
          this._result = null;
          this._reportText = null;
        } else {
          this._state = 'success';
          this._result = data.result;
          this._error = null;
          this._reportText = serialized.text;
        }
      } else {
        this._state = 'error';
        this._error = data.error;
        this._result = null;
        this._reportText = null;
      }
      this._emit();
    };
    worker.onerror = () => {
      if (this._state !== 'busy') return;
      this._terminateWorker();
      this._state = 'error';
      this._error = { code: 'WORKER_ERROR', field: null, row: null };
      this._emit();
    };
    worker.postMessage({ snapshot, generation });
  }

  cancel() {
    if (this._state !== 'busy') return;
    this._terminateWorker();
    this._generation += 1;
    this._invalidate();
    this._state = 'cancelled';
    this._emit();
  }

  reset() {
    this._terminateWorker();
    this._generation += 1;
    this._draft = { ...DEFAULT_DRAFT };
    this._invalidate();
    this._state = 'empty';
    this._emit();
  }
}
