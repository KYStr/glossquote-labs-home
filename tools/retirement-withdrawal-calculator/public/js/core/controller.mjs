// Retirement Withdrawal Calculator — controller.
// Owns the per-mode drafts, the work generation counter and the six flow
// states (empty / dirty / busy / success / error / cancelled). Switching
// modes keeps each mode's inputs; reset restores the depletion defaults.
// Transport is injected: { send(snapshot, generation), terminate() }. Late
// results from an older generation, or results delivered while not busy,
// are dropped.

import { buildReport } from "./core.mjs";

export const DEFAULT_DRAFTS = Object.freeze({
  depletion: Object.freeze({
    mode: "depletion",
    portfolioValue: "",
    annualWithdrawal: "",
    returnRatePct: "5",
    inflationRatePct: "2",
  }),
  "four-percent": Object.freeze({
    mode: "four-percent",
    annualSpending: "",
    currentPortfolio: "",
  }),
});
export const EXAMPLE_DRAFT = Object.freeze({
  mode: "depletion",
  portfolioValue: "1000000",
  annualWithdrawal: "50000",
  returnRatePct: "0",
  inflationRatePct: "0",
});

function freshDrafts() {
  return {
    depletion: { ...DEFAULT_DRAFTS.depletion },
    "four-percent": { ...DEFAULT_DRAFTS["four-percent"] },
  };
}

export class Controller {
  constructor(transport) {
    this.transport = transport;
    this.mode = "depletion";
    this.drafts = freshDrafts();
    this.state = "empty";
    this.generation = 0;
    this.result = null;
    this.error = null;
    this.reportBytes = null;
    this.exampleLoaded = false;
  }

  get draft() {
    return { ...this.drafts[this.mode] };
  }

  get reportAvailable() {
    return this.state === "success" && this.reportBytes !== null;
  }

  snapshot() {
    return {
      state: this.state,
      draft: this.draft,
      drafts: {
        depletion: { ...this.drafts.depletion },
        "four-percent": { ...this.drafts["four-percent"] },
      },
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
  // A mode change switches to that mode's preserved draft; only keys that
  // belong to the active mode's draft are merged.
  edit(patch) {
    if (this.state === "busy") {
      this.generation += 1;
      this.transport.terminate();
    }
    const rest = { ...patch };
    if (typeof rest.mode === "string" && (rest.mode === "depletion" || rest.mode === "four-percent")) {
      this.mode = rest.mode;
    }
    delete rest.mode;
    const current = this.drafts[this.mode];
    const merged = { ...current };
    for (const key of Object.keys(rest)) {
      if (key in current) merged[key] = rest[key];
    }
    this.drafts[this.mode] = merged;
    this.exampleLoaded = false;
    this.#invalidate();
    this.state = "dirty";
  }

  loadExample() {
    if (this.state === "busy") {
      this.generation += 1;
      this.transport.terminate();
    }
    this.drafts.depletion = { ...EXAMPLE_DRAFT };
    this.mode = "depletion";
    this.#invalidate();
    this.exampleLoaded = true;
    this.state = "dirty";
  }

  run() {
    if (this.state === "busy") return;
    this.generation += 1;
    this.#invalidate();
    this.state = "busy";
    this.transport.send({ ...this.drafts[this.mode] }, this.generation);
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
    this.mode = "depletion";
    this.drafts = freshDrafts();
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
