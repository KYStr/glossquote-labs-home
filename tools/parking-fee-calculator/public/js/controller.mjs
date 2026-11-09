// Controller for the Parking Fee Calculator: owns the draft, the run
// generation, and the state machine (empty / dirty / busy / success /
// error / cancelled) pinned by SPEC.md. Talks to the worker through an
// injected port ({ post, setOnMessage, terminate }) so tests can drive it
// with a controllable fake worker. No DOM access here.

import { DEFAULT_DRAFT, buildReport } from "./core/parking.mjs";

export class ParkingController {
  constructor(port) {
    this._port = port;
    this._generation = 0;
    this._inFlight = false;
    this.state = "empty";
    this.draft = { ...DEFAULT_DRAFT };
    this.result = null;
    this.error = null;
    this.onChange = null;
    this._port.setOnMessage((message) => this._onMessage(message));
  }

  _emit() {
    if (typeof this.onChange === "function") this.onChange(this);
  }

  _invalidate() {
    this.result = null;
    this.error = null;
  }

  _stopWork() {
    if (this._inFlight) {
      this._inFlight = false;
      this._port.terminate();
    }
  }

  // Any edit (field, switch, source, example load) invalidates the old
  // result and its download immediately.
  edit(nextDraft) {
    this._generation += 1;
    this._stopWork();
    this.draft = { ...nextDraft };
    this._invalidate();
    this.state = "dirty";
    this._emit();
  }

  run() {
    this._generation += 1;
    this._stopWork();
    this._invalidate();
    this.state = "busy";
    this._inFlight = true;
    const snapshot = { ...this.draft };
    this._emit();
    this._port.post({ generation: this._generation, input: snapshot });
  }

  cancel() {
    if (this.state !== "busy") return;
    this._generation += 1;
    this._stopWork();
    this._invalidate();
    this.state = "cancelled";
    this._emit();
  }

  reset() {
    this._generation += 1;
    this._stopWork();
    this.draft = { ...DEFAULT_DRAFT };
    this._invalidate();
    this.state = "empty";
    this._emit();
  }

  _onMessage(message) {
    if (message === null || typeof message !== "object") return;
    if (message.generation !== this._generation) return; // late / stale
    if (this.state !== "busy") return;
    this._inFlight = false;
    this._port.terminate(); // worker is stopped after success too
    const outcome = message.outcome;
    if (outcome !== null && typeof outcome === "object" && outcome.ok === true) {
      this.result = outcome.result;
      this.error = null;
      this.state = "success";
    } else if (
      outcome !== null &&
      typeof outcome === "object" &&
      outcome.ok === false &&
      outcome.error !== null &&
      typeof outcome.error === "object"
    ) {
      this.result = null;
      this.error = outcome.error;
      this.state = "error";
    } else {
      this.result = null;
      this.error = { code: "WORKER_ERROR", field: null, row: null };
      this.state = "error";
    }
    this._emit();
  }

  get reportAvailable() {
    return this.state === "success" && this.result !== null;
  }

  // Report bytes for the current successful snapshot; OUTPUT_LIMIT when the
  // canonical report exceeds the pinned byte cap.
  getReport() {
    if (!this.reportAvailable) return null;
    return buildReport(this.result);
  }
}
