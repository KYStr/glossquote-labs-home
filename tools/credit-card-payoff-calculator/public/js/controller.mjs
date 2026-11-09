// Controller for the Credit Card Payoff Calculator.
//
// Owns the draft, the six flow states (empty, dirty, busy, success,
// error, cancelled), the work generation counter and the Worker
// lifecycle. Every edit, cancel, reset or new run invalidates the old
// result and its report immediately and increments the generation, so
// a late message from an older generation can never revive a stale
// result. The worker factory is injected, which keeps this module
// testable in Node with a fake worker.

import { DEFAULT_DRAFT, buildReport, draftToInput } from "./core/payoff.mjs";

const WORKER_ERROR = Object.freeze({ code: "WORKER_ERROR", field: null, row: null });

export class PayoffController {
  constructor({ createWorker, defaults = DEFAULT_DRAFT } = {}) {
    if (typeof createWorker !== "function") {
      throw new Error("PayoffController requires a createWorker factory.");
    }
    this.createWorker = createWorker;
    this.defaults = { ...defaults };
    this.draft = { ...defaults };
    this.state = "empty";
    this.result = null;
    this.error = null;
    this.reportBytes = null;
    this.generation = 0;
    this.worker = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get reportAvailable() {
    return this.state === "success" && this.reportBytes !== null;
  }

  emit() {
    for (const listener of this.listeners) listener(this);
  }

  invalidate() {
    this.result = null;
    this.error = null;
    this.reportBytes = null;
  }

  terminateWorker() {
    if (this.worker !== null) {
      try {
        this.worker.terminate();
      } catch {
        // Terminating an already-dead worker is not an error.
      }
      this.worker = null;
    }
  }

  edit(draft) {
    this.terminateWorker();
    this.generation += 1;
    this.draft = { ...draft };
    this.invalidate();
    this.state = "dirty";
    this.emit();
  }

  run() {
    this.terminateWorker();
    this.generation += 1;
    const generation = this.generation;
    const input = draftToInput(this.draft);
    this.invalidate();
    this.state = "busy";
    this.emit();

    let worker;
    try {
      worker = this.createWorker();
    } catch {
      this.state = "error";
      this.error = { ...WORKER_ERROR };
      this.emit();
      return;
    }
    this.worker = worker;

    worker.onmessage = (event) => {
      if (generation !== this.generation || this.state !== "busy") return;
      const data = event?.data;
      this.terminateWorker();
      if (!data || data.generation !== generation || typeof data.outcome !== "object" || data.outcome === null) {
        this.state = "error";
        this.error = { ...WORKER_ERROR };
        this.emit();
        return;
      }
      const outcome = data.outcome;
      if (outcome.ok === true && outcome.result) {
        const report = buildReport(outcome.result);
        if (!report.ok) {
          this.state = "error";
          this.error = { ...report.error };
          this.emit();
          return;
        }
        this.result = outcome.result;
        this.reportBytes = report.bytes;
        this.state = "success";
      } else if (outcome.ok === false && outcome.error) {
        this.error = {
          code: outcome.error.code,
          field: outcome.error.field ?? null,
          row: outcome.error.row ?? null,
        };
        this.state = "error";
      } else {
        this.error = { ...WORKER_ERROR };
        this.state = "error";
      }
      this.emit();
    };
    worker.onerror = () => {
      if (generation !== this.generation || this.state !== "busy") return;
      this.terminateWorker();
      this.state = "error";
      this.error = { ...WORKER_ERROR };
      this.emit();
    };

    try {
      worker.postMessage({ generation, input });
    } catch {
      this.terminateWorker();
      this.state = "error";
      this.error = { ...WORKER_ERROR };
      this.emit();
    }
  }

  cancel() {
    if (this.state !== "busy") return;
    this.terminateWorker();
    this.generation += 1;
    this.invalidate();
    this.state = "cancelled";
    this.emit();
  }

  reset() {
    this.terminateWorker();
    this.generation += 1;
    this.draft = { ...this.defaults };
    this.invalidate();
    this.state = "empty";
    this.emit();
  }

  dispose() {
    this.terminateWorker();
    this.generation += 1;
  }
}
