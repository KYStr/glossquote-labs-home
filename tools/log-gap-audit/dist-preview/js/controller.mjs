// Log Gap Audit — draft / generation / worker controller.
// Pure logic, no DOM: the browser app wires this to the page, and the tests
// drive it with a fake worker whose delivery time they control.
// Implements the SPEC state machine: empty / dirty / busy / success / error
// / cancelled. Only a result from the current generation, received while
// busy, is accepted; late results can never revive an old outcome.

import { serializeReport, DEFAULT_THRESHOLD, REPORT_FILENAME } from './core/audit.mjs';

export const DEFAULT_DRAFT = { records: '', threshold: DEFAULT_THRESHOLD };
export const EXAMPLE_DRAFT = {
  records: '10\t0\n13\t1500\n14\t2500',
  threshold: '1000',
};

function isDefaultDraft(draft) {
  return draft.records === '' && draft.threshold === DEFAULT_THRESHOLD;
}

export class AuditController {
  // createWorker: () => worker-like ({postMessage, terminate, onmessage,
  // onerror}). May return a worker or a Promise of one; the browser factory
  // builds a module worker from the fixed embedded core source, served from
  // a blob URL.
  // onChange: () => void, called after every state transition.
  constructor({ createWorker, onChange }) {
    this.createWorker = createWorker;
    this.onChange = typeof onChange === 'function' ? onChange : () => {};
    this.state = 'empty';
    this.draft = { ...DEFAULT_DRAFT };
    this.result = null;
    this.report = null; // {text, bytes} when state === 'success'
    this.error = null; // {code, field, row} when state === 'error'
    this.exampleLoaded = false;
    this.generation = 0;
    this.worker = null;
    this.fileToken = 0;
  }

  emit() {
    this.onChange();
  }

  terminateWorker() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Terminating a worker never blocks the state transition.
      }
      this.worker = null;
    }
  }

  invalidate() {
    this.result = null;
    this.report = null;
    this.error = null;
    this.exampleLoaded = false;
  }

  // Any draft change invalidates the old result and download. Editing while
  // busy terminates the old job. Returns the new state.
  setDraft(patch) {
    this.draft = { ...this.draft, ...patch };
    this.terminateWorker();
    this.generation += 1;
    this.fileToken += 1; // A pending file buffer becomes stale.
    this.invalidate();
    this.state = isDefaultDraft(this.draft) ? 'empty' : 'dirty';
    this.emit();
    return this.state;
  }

  loadExample() {
    this.draft = { ...EXAMPLE_DRAFT };
    this.terminateWorker();
    this.generation += 1;
    this.fileToken += 1; // A pending file buffer becomes stale.
    this.invalidate();
    this.exampleLoaded = true;
    this.state = 'dirty';
    this.emit();
    return this.state;
  }

  // Reads a user-chosen file as bytes and pastes its UTF-8 text into the
  // records field. A buffer that arrives after a newer file load, edit, run,
  // cancel or reset is discarded. A read failure is a resource failure
  // (INTERNAL) and keeps the draft.
  async loadFile(file) {
    const token = ++this.fileToken;
    let buffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      if (token === this.fileToken) {
        this.error = { code: 'INTERNAL', field: null, row: null };
        this.state = 'error';
        this.emit();
      }
      return;
    }
    if (token !== this.fileToken) return; // Late buffer: discard.
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    this.setDraft({ records: text });
  }

  async run() {
    const snapshot = { ...this.draft };
    this.terminateWorker();
    this.generation += 1;
    this.fileToken += 1; // A pending file buffer becomes stale.
    const generation = this.generation;
    this.invalidate();
    this.state = 'busy';
    this.emit();

    let worker;
    try {
      worker = await this.createWorker();
    } catch {
      if (generation === this.generation && this.state === 'busy') {
        this.error = { code: 'WORKER_ERROR', field: null, row: null };
        this.state = 'error';
        this.emit();
      }
      return;
    }
    if (generation !== this.generation) {
      // Cancelled, edited, reset or replaced while the worker was created.
      try {
        worker.terminate();
      } catch {
        // Ignore.
      }
      return;
    }
    this.worker = worker;
    worker.onmessage = (event) => this.onWorkerMessage(event);
    worker.onerror = () => this.onWorkerError(generation);
    worker.postMessage({ generation, input: snapshot });
  }

  onWorkerMessage(event) {
    const data = event && event.data ? event.data : {};
    // Only the current generation, received while busy, is accepted.
    if (data.generation !== this.generation || this.state !== 'busy') return;
    this.terminateWorker();
    if (data.ok) {
      const report = serializeReport(data.result);
      if (!report.ok) {
        this.result = null;
        this.report = null;
        this.error = report.error;
        this.state = 'error';
        this.emit();
        return;
      }
      this.result = data.result;
      this.report = { text: report.text, bytes: report.bytes };
      this.error = null;
      this.state = 'success';
      this.emit();
      return;
    }
    this.result = null;
    this.report = null;
    this.error = data.error || { code: 'INTERNAL', field: null, row: null };
    this.state = 'error';
    this.emit();
  }

  onWorkerError(generation) {
    if (generation !== this.generation || this.state !== 'busy') return;
    this.terminateWorker();
    this.result = null;
    this.report = null;
    this.error = { code: 'WORKER_ERROR', field: null, row: null };
    this.state = 'error';
    this.emit();
  }

  cancel() {
    if (this.state !== 'busy') return this.state;
    this.terminateWorker();
    this.generation += 1;
    this.fileToken += 1; // A pending file buffer becomes stale.
    this.invalidate();
    this.state = 'cancelled';
    this.emit();
    return this.state;
  }

  reset() {
    this.terminateWorker();
    this.generation += 1;
    this.fileToken += 1;
    this.draft = { ...DEFAULT_DRAFT };
    this.invalidate();
    this.state = 'empty';
    this.emit();
    return this.state;
  }

  // Download payload for the current snapshot only; null unless success.
  downloadPayload() {
    if (this.state !== 'success' || !this.report) return null;
    return { filename: REPORT_FILENAME, text: this.report.text };
  }

  // Page hide / disposal: terminate the worker and drop references.
  dispose() {
    this.terminateWorker();
    this.generation += 1;
  }
}
