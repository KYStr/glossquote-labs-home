// Generator Size Calculator — controller.
// Owns the draft (an appliance list), the work generation counter and
// the six flow states (empty / dirty / busy / success / error /
// cancelled). Transport is injected: { send(snapshot, generation),
// terminate() }. Late results from an older generation, or results
// delivered while not busy, are dropped.

import { buildReport, MAX_ROWS } from "./core.mjs";

export const DEFAULT_DRAFT = Object.freeze({
  appliances: Object.freeze([
    Object.freeze({ name: "Refrigerator", runningWatts: "192", startingWatts: "1200" }),
    Object.freeze({ name: "Lights", runningWatts: "100", startingWatts: "100" }),
  ]),
});

// The example is the first SPEC fixture (fridge-lights-tv).
export const EXAMPLE_DRAFT = Object.freeze({
  appliances: Object.freeze([
    Object.freeze({ name: "Refrigerator", runningWatts: "192", startingWatts: "1200" }),
    Object.freeze({ name: "Lights", runningWatts: "100", startingWatts: "100" }),
    Object.freeze({ name: "TV", runningWatts: "190", startingWatts: "190" }),
  ]),
});

export const EMPTY_ROW = Object.freeze({ name: "", runningWatts: "", startingWatts: "" });

function copyAppliances(appliances) {
  return appliances.map((row) => ({ ...row }));
}

export class Controller {
  constructor(transport) {
    this.transport = transport;
    this.draft = { appliances: copyAppliances(DEFAULT_DRAFT.appliances) };
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
      draft: { appliances: copyAppliances(this.draft.appliances) },
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

  // Any edit invalidates the old result and download immediately;
  // editing during busy terminates the old work.
  #applyDraft(appliances, exampleLoaded) {
    if (this.state === "busy") {
      this.generation += 1;
      this.transport.terminate();
    }
    this.draft = { appliances: copyAppliances(appliances) };
    this.exampleLoaded = exampleLoaded;
    this.#invalidate();
    this.state = "dirty";
  }

  // Replace the whole appliance list (the app calls this with the list
  // it reads from the DOM after any row change).
  edit(appliances) {
    this.#applyDraft(appliances, false);
  }

  addRow() {
    if (this.draft.appliances.length >= MAX_ROWS) return;
    this.#applyDraft([...this.draft.appliances, { ...EMPTY_ROW }], false);
  }

  removeRow(index) {
    if (this.draft.appliances.length <= 1) return;
    if (index < 0 || index >= this.draft.appliances.length) return;
    const next = copyAppliances(this.draft.appliances);
    next.splice(index, 1);
    this.#applyDraft(next, false);
  }

  loadExample() {
    this.#applyDraft(EXAMPLE_DRAFT.appliances, true);
  }

  run() {
    if (this.state === "busy") return;
    this.generation += 1;
    this.#invalidate();
    this.state = "busy";
    this.transport.send({ appliances: copyAppliances(this.draft.appliances) }, this.generation);
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
    this.draft = { appliances: copyAppliances(DEFAULT_DRAFT.appliances) };
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
