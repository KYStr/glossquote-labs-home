// Percentage Calculator — controller.
// Owns the draft, the work generation counter and the six flow states
// (empty / dirty / busy / success / error / cancelled). Transport is
// injected: { send(snapshot, generation), terminate() }. Late results from
// an older generation, or results delivered while not busy, are dropped.

import { buildReport } from "./core.mjs";

export const DEFAULT_DRAFT = Object.freeze({ mode: "of", first: "20", second: "150" });
export const EXAMPLE_DRAFT = Object.freeze({ mode: "of", first: "20", second: "150" });

export class Controller {
  constructor(transport) {
    this.transport = transport;
    this.draft = { ...DEFAULT_DRAFT };
    this.state = "empty";
    this.generation = 0;
    this.result = null;
    this.error = null;
    this.reportBytes = null;
    this.exampleLoaded = false;
  }

  get reportAvailable() {
    return this.state === "success" && this.reportBytes !== null;
  }

  snapshot() {
    return {
      state: this.state,
      draft: { ...this.draft },
      result: this.result,
      error: this.error,
      reportAvailable: this.reportAvailable,
      exampleLoaded: this.exampleLoaded,
    };
  }

  #invalidate() {
    this.result = null;
    this.error = null;
    this.reportBytes = null;
  }

  // Any edit (field, mode, source or example) invalidates the old result and
  // download immediately; editing during busy terminates the old work.
  edit(patch) {
    if (this.state === "busy") {
      this.generation += 1;
      this.transport.terminate();
    }
    this.draft = { ...this.draft, ...patch };
    this.exampleLoaded = false;
    this.#invalidate();
    this.state = "dirty";
  }

  loadExample() {
    if (this.state === "busy") {
      this.generation += 1;
      this.transport.terminate();
    }
    this.draft = { ...EXAMPLE_DRAFT };
    this.#invalidate();
    this.exampleLoaded = true;
    this.state = "dirty";
  }

  run() {
    if (this.state === "busy") return;
    this.generation += 1;
    this.#invalidate();
    this.state = "busy";
    this.transport.send({ ...this.draft }, this.generation);
  }

  // Signal whether this completion changed the visible state.
  deliver(generation, outcome) {
    if (generation !== this.generation || this.state !== "busy") return false;
    this.transport.terminate();
    if (outcome && outcome.ok === true) {
      const report = buildReport(outcome.result);
      if (!report.ok) {
        this.#invalidate();
        this.error = report.error;
        this.state = "error";
        return true;
      }
      this.result = outcome.result;
      this.reportBytes = report.bytes;
      this.error = null;
      this.state = "success";
    } else {
      this.#invalidate();
      this.error =
        outcome && outcome.error
          ? outcome.error
          : { code: "WORKER_ERROR", field: null, row: null };
      this.state = "error";
    }
    return true;
  }

  cancel() {
    if (this.state !== "busy") return;
    this.generation += 1;
    this.transport.terminate();
    this.#invalidate();
    this.state = "cancelled";
  }

  reset() {
    this.generation += 1;
    this.transport.terminate();
    this.draft = { ...DEFAULT_DRAFT };
    this.exampleLoaded = false;
    this.#invalidate();
    this.state = "empty";
  }

  // Stop in-flight work without changing the visible state (pagehide).
  stopWork() {
    if (this.state === "busy") {
      this.generation += 1;
      this.transport.terminate();
    }
  }
}
